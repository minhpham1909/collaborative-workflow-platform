export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export function createApi({
  origin,
  fetcher = fetch,
  lock = async (fn) => fn(),
  onSession = () => {},
}) {
  let access = null,
    csrf = null,
    refreshing = null,
    epoch = 0;
  async function raw(path, { method = "GET", body, headers = {} } = {}) {
    const response = await fetcher(origin + path, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok)
      throw new ApiError(
        data?.error?.code ?? "REQUEST_FAILED",
        response.status,
      );
    return data;
  }
  function session(data) {
    access = data.accessToken;
    csrf = data.csrfToken;
    onSession(data.user);
    return data.user;
  }
  function clear() {
    epoch++;
    access = null;
    csrf = null;
    onSession(null);
  }
  async function restore() {
    if (refreshing) return refreshing;
    const generation = epoch;
    const run = lock(async () => {
      const challenge = await raw("/auth/csrf");
      const data = await raw("/auth/refresh", {
        method: "POST",
        body: {},
        headers: { "X-CSRF-Token": challenge.csrfToken },
      });
      if (generation !== epoch) throw new ApiError("SESSION_CHANGED", 401);
      return session(data);
    });
    refreshing = run;
    try {
      return await run;
    } catch (error) {
      if (error.status === 401 && generation === epoch) clear();
      throw error;
    } finally {
      if (refreshing === run) refreshing = null;
    }
  }
  async function request(path, options = {}) {
    if (!access) await restore();
    const observed = access;
    try {
      return await raw(path, {
        ...options,
        headers: { Authorization: "Bearer " + observed, ...options.headers },
      });
    } catch (error) {
      if (error.status !== 401 || (options.method && options.method !== "GET"))
        throw error;
      if (access === observed) await restore();
      return raw(path, {
        ...options,
        headers: { Authorization: "Bearer " + access, ...options.headers },
      });
    }
  }
  return {
    raw,
    request,
    restore,
    clear,
    async resetPassword(body) {
      const generation = epoch;
      return lock(async () => {
        if (generation !== epoch) throw new ApiError("SESSION_CHANGED", 401);
        const data = await raw("/auth/password/reset", {
          method: "POST",
          body,
        });
        if (generation !== epoch) throw new ApiError("SESSION_CHANGED", 401);
        clear();
        return data;
      });
    },
    async changePassword(body) {
      if (!access) await restore();
      const generation = epoch;
      return lock(async () => {
        if (generation !== epoch) throw new ApiError("SESSION_CHANGED", 401);
        const observed = access;
        const challenge = await raw("/auth/csrf");
        if (generation !== epoch) throw new ApiError("SESSION_CHANGED", 401);
        const data = await raw("/auth/password/change", {
          method: "POST",
          body,
          headers: {
            Authorization: "Bearer " + observed,
            "X-CSRF-Token": challenge.csrfToken,
          },
        });
        if (generation !== epoch) throw new ApiError("SESSION_CHANGED", 401);
        epoch++;
        return session(data);
      });
    },
    async login(body) {
      const generation = ++epoch;
      const data = await raw("/auth/login", { method: "POST", body });
      if (generation !== epoch) throw new ApiError("SESSION_CHANGED", 401);
      return session(data);
    },
    async google(body) {
      const generation = ++epoch;
      const data = await raw("/auth/google", { method: "POST", body });
      if (generation !== epoch) throw new ApiError("SESSION_CHANGED", 401);
      return session(data);
    },
    async logout() {
      await lock(async () => {
        const challenge = await raw("/auth/csrf");
        await raw("/auth/logout", {
          method: "POST",
          body: {},
          headers: { "X-CSRF-Token": challenge.csrfToken },
        });
      });
      clear();
    },
  };
}
