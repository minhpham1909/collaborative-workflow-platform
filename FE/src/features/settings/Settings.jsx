import PasswordField from "../../components/PasswordField.jsx";
import FormField from "../../components/FormField.jsx";
import { useDraftGuard } from "../../lib/draft-navigation.js";
import { confirmDialog } from "../../components/NotificationProvider.jsx";
import { useEffect, useRef, useState } from "react";
import Avatar from "../../components/Avatar.jsx";
import { messageFor } from "../../lib/messages.js";
import { loadGoogle } from "../../lib/google.js";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
const validPassword = (value) =>
  [...value].length >= 12 &&
  [...value].length <= 128 &&
  new TextEncoder().encode(value).length <= 512;
const names = {
  assignment: "Khi được phân công hoặc thay đổi người thực hiện",
  comment: "Bình luận mới",
  content: "Nội dung hoặc deadline thay đổi",
  status: "Trạng thái Task thay đổi",
};
export default function Settings({ api, onUser }) {
  const [data, setData] = useState(null),
    [tab, setTab] = useState("profile"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [revision, setRevision] = useState(0),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setError("");
    setData(null);
    api
      .request("/users/me")
      .then((value) => {
        if (live) {
          setData(value);
          onUser(value.user);
        }
      })
      .catch((e) => {
        if (live) setError(messageFor(e));
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [revision]);
  useDraftGuard({
    dirty: dirty,
    busy: saving,
    message: "Bỏ thay đổi tài khoản chưa lưu?",
  });

  const leave = async () =>
    !dirty || (await confirmDialog("Bỏ thay đổi cài đặt chưa lưu?"));
  function saved(user) {
    setData((old) => ({ ...old, user }));
    onUser(user);
    setDirty(false);
  }
  return (
    <main className="settings-page">
      <section className="hero">
        <div>
          <small>TÙY CHỈNH KHÔNG GIAN CỦA BẠN</small>
          <h1>Tài khoản & Cài đặt cá nhân</h1>
          <p>Thông tin hồ sơ, email công việc và bảo mật đăng nhập.</p>
        </div>
        <button
          disabled={busy || saving}
          onClick={async () => {
            if (await leave()) {
              setDirty(false);
              setRevision((v) => v + 1);
            }
          }}
        >
          Tải lại tài khoản
        </button>
      </section>
      <div className="tabs">
        {[
          ["profile", "Hồ sơ"],
          ["preferences", "Tùy chọn email"],
          ["security", "Bảo mật & Google"],
        ].map(([value, label]) => (
          <button
            key={value}
            disabled={saving}
            aria-pressed={tab === value}
            onClick={async () => {
              if (tab !== value && (await leave())) {
                setDirty(false);
                setTab(value);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {busy && <p role="status">Đang tải tài khoản…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {data &&
        (tab === "security" ? (
          <Security
            key={"security" + revision}
            api={api}
            data={data}
            onUser={saved}
            onDirty={setDirty}
            onSaving={setSaving}
            reload={() => setRevision((v) => v + 1)}
          />
        ) : (
          <EditSettings
            key={tab + revision}
            api={api}
            data={data}
            tab={tab}
            onUser={saved}
            onDirty={setDirty}
            onSaving={setSaving}
          />
        ))}
    </main>
  );
}
function EditSettings({ api, data, tab, onUser, onDirty, onSaving }) {
  const [name, setName] = useState(data.user.displayName),
    [locale, setLocale] = useState(data.user.locale ?? ""),
    [prefs, setPrefs] = useState({ ...data.user.emailPreferences }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef(false);
  const [nameError, setNameError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (pending.current || uncertain) return;
    if (
      tab === "profile" &&
      (!name.trim() || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(name))
    ) {
      setNameError(
        "Tên hiển thị chưa hợp lệ. Nhập tên có nội dung, không có ký tự điều khiển.",
      );
      e.currentTarget.querySelector("input")?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    onSaving(true);
    setError("");
    setNote("");
    try {
      const result = await api.request(
        "/users/me/" + (tab === "profile" ? "profile" : "preferences"),
        {
          method: "PATCH",
          body: {
            expectedVersion: data.user.version,
            ...(tab === "profile"
              ? { displayName: name }
              : { locale: locale || null, emailPreferences: prefs }),
          },
        },
      );
      onUser(result.user);
      setNote("Đã lưu cài đặt.");
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : "Chưa rõ thay đổi đã lưu chưa. Kiểm tra lại tài khoản trước khi gửi tiếp.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onSaving(false);
    }
  }
  return (
    <section className="project-info settings-card">
      <form onSubmit={submit}>
        <fieldset disabled={busy || uncertain} onChange={() => onDirty(true)}>
          {tab === "profile" ? (
            <>
              <div className="account-profile">
                <Avatar user={data.user} />
                <div>
                  <h2>Hồ sơ của bạn</h2>
                  <p>
                    {data.user.email} ·{" "}
                    {data.user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
                  </p>
                </div>
              </div>
              <FormField
                label="Tên hiển thị"
                hint="Tối đa 100 ký tự."
                error={nameError}
              >
                {(props) => (
                  <input
                    {...props}
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError("");
                    }}
                  />
                )}
              </FormField>
              <p className="muted">
                Email tài khoản chỉ đọc. Avatar lấy từ Google đã liên kết; nếu
                chưa có ảnh sẽ dùng chữ cái tên.
              </p>
            </>
          ) : (
            <>
              <h2>Email công việc</h2>
              <p>
                Áp dụng chung toàn tài khoản. Tùy chọn riêng của bạn trong mỗi
                Workspace được ưu tiên.
              </p>
              {Object.entries(names).map(([key, label]) => (
                <label className="preference-row" key={key}>
                  <input
                    type="checkbox"
                    aria-label={label}
                    checked={prefs[key]}
                    onChange={(e) =>
                      setPrefs((old) => ({ ...old, [key]: e.target.checked }))
                    }
                  />
                  <span>
                    <strong>{label}</strong>
                    <small>
                      {
                        {
                          assignment:
                            "Theo dõi những công việc vừa được giao cho bạn.",
                          comment: "Cập nhật trao đổi mới trong công việc.",
                          content:
                            "Biết khi nội dung hoặc hạn hoàn thành được điều chỉnh.",
                          status: "Nhận tin khi công việc chuyển trạng thái.",
                        }[key]
                      }
                    </small>
                  </span>
                </label>
              ))}
              <label className="language-preference">
                Ngôn ngữ ưu tiên
                <select
                  aria-label="Ngôn ngữ ưu tiên"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                >
                  <option value="">Mặc định (Tiếng Việt)</option>
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </label>
              <p className="muted">
                Hiện áp dụng cho email công việc; giao diện hiện dùng tiếng
                Việt. Email xác minh và bảo mật vẫn được gửi không phụ thuộc tùy
                chọn công việc.
              </p>
            </>
          )}
          <button className="primary">
            {busy
              ? "Đang lưu…"
              : tab === "profile"
                ? "Lưu hồ sơ"
                : "Lưu tùy chọn email"}
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {note && <p role="status">{note}</p>}
      </form>
    </section>
  );
}
function Security({ api, data, onUser, onDirty, onSaving, reload }) {
  const [fieldErrors, setFieldErrors] = useState({});
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [linking, setLinking] = useState(false),
    [linkPassword, setLinkPassword] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef(false),
    target = useRef(null),
    linkSecret = useRef("");
  useEffect(() => {
    linkSecret.current = linkPassword;
  }, [linkPassword]);
  useEffect(() => {
    if (!linking) return;
    let live = true;
    (async () => {
      try {
        const caps = await api.raw("/auth/capabilities");
        if (!caps.googleClientId) throw { code: "GOOGLE_NOT_CONFIGURED" };
        await loadGoogle();
        const challenge = await api.request("/auth/google/link/challenge", {
          method: "POST",
          body: {},
        });
        if (!live) return;
        window.google.accounts.id.initialize({
          client_id: caps.googleClientId,
          nonce: challenge.nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            if (!live || pending.current) return;
            pending.current = true;
            setBusy(true);
            onSaving(true);
            try {
              await api.request("/auth/google/link", {
                method: "POST",
                body: { credential, currentPassword: linkSecret.current },
              });
              setLinkPassword("");
              linkSecret.current = "";
              onDirty(false);
              reload();
            } catch (e) {
              if (live) {
                setError(messageFor(e));
                setLinking(false);
              }
            } finally {
              pending.current = false;
              if (live) {
                setBusy(false);
                onSaving(false);
              }
            }
          },
        });
        window.google.accounts.id.renderButton(target.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          locale: "vi",
          width: 300,
        });
      } catch (e) {
        if (live) {
          setError(messageFor(e));
          setLinking(false);
        }
      }
    })();
    return () => {
      live = false;
      linkSecret.current = "";
      target.current?.replaceChildren();
    };
  }, [linking, api]);
  useEffect(() => () => onSaving(false), []);
  async function change(e) {
    e.preventDefault();
    if (pending.current || uncertain) return;
    if (
      !validPassword(current) ||
      !validPassword(password) ||
      password !== repeat
    ) {
      setFieldErrors({
        current: !validPassword(current)
          ? "Mật khẩu từ 12–128 ký tự, tối đa 512 byte UTF-8."
          : "",
        password: !validPassword(password)
          ? "Mật khẩu từ 12–128 ký tự, tối đa 512 byte UTF-8."
          : "",
        repeat: password !== repeat ? "Xác nhận mật khẩu phải khớp." : "",
      });
      return;
    }
    pending.current = true;
    setFieldErrors({});
    setBusy(true);
    onSaving(true);
    setError("");
    setNote("");
    try {
      const user = await api.changePassword({
        currentPassword: current,
        password,
      });
      setCurrent("");
      setPassword("");
      setRepeat("");
      setLinkPassword("");
      linkSecret.current = "";
      onDirty(false);
      onUser(user);
      setNote(
        "Đã đổi mật khẩu. Các phiên khác đã được thu hồi; phiên này tiếp tục đăng nhập.",
      );
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : "Chưa xác nhận thay đổi mật khẩu. Đăng nhập lại để kiểm tra trước khi thử tiếp.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onSaving(false);
    }
  }
  return (
    <>
      <section className="project-info settings-card">
        <h2>Phương thức đăng nhập</h2>
        <p className="login-method">
          {data.account.hasLocalPassword
            ? "Email và mật khẩu"
            : "Tài khoản Google-only · Không có mật khẩu riêng"}
        </p>
        <p className="login-method google-method">
          Google: {data.account.googleLinked ? "Đã liên kết" : "Chưa liên kết"}
        </p>
        {data.account.hasLocalPassword && (
          <form className="password-form" onSubmit={change}>
            <h3>Đổi mật khẩu</h3>
            <p className="muted">
              Dùng 12–128 ký tự. Sau khi đổi, các phiên đăng nhập khác sẽ được
              thu hồi.
            </p>
            <fieldset
              disabled={busy || linking || uncertain}
              onChange={() => onDirty(true)}
            >
              <PasswordField
                label="Mật khẩu hiện tại"
                error={fieldErrors.current}
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => {
                  setCurrent(e.target.value);
                  setFieldErrors((old) => ({ ...old, current: "" }));
                }}
              />
              <PasswordField
                label="Mật khẩu mới"
                error={fieldErrors.password}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((old) => ({
                    ...old,
                    password: "",
                    repeat: "",
                  }));
                }}
              />
              <PasswordField
                label="Xác nhận mật khẩu mới"
                error={fieldErrors.repeat}
                required
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => {
                  setRepeat(e.target.value);
                  setFieldErrors((old) => ({ ...old, repeat: "" }));
                }}
              />
              <button className="primary">
                {busy ? "Đang đổi…" : "Đổi mật khẩu"}
              </button>
            </fieldset>
          </form>
        )}
        {!data.account.hasLocalPassword && (
          <p>
            Tiếp tục đăng nhập bằng Google; tài khoản này không cần mật khẩu hệ
            thống.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {note && <p role="status">{note}</p>}
      </section>
      {data.account.hasLocalPassword && !data.account.googleLinked && (
        <section className="project-info settings-card">
          <h2>Liên kết Google</h2>
          <p>
            Chọn Google account cùng email {data.user.email}. Hệ thống không
            liên kết email khác hoặc Google identity đã thuộc tài khoản khác.
          </p>
          <PasswordField
            label="Mật khẩu xác nhận liên kết"
            autoComplete="current-password"
            disabled={busy || linking}
            value={linkPassword}
            onChange={(e) => {
              setLinkPassword(e.target.value);
              onDirty(true);
            }}
          />
          <button
            disabled={busy || linking}
            onClick={() => {
              if (!validPassword(linkPassword)) {
                setError("Nhập mật khẩu hiện tại hợp lệ để xác nhận.");
                return;
              }
              setError("");
              linkSecret.current = linkPassword;
              setLinking(true);
            }}
          >
            Xác nhận & Chọn Google
          </button>
          {linking && (
            <button
              disabled={busy}
              onClick={() => {
                setLinking(false);
                setLinkPassword("");
                onDirty(Boolean(current || password || repeat));
              }}
            >
              Hủy liên kết
            </button>
          )}
          <div ref={target} />
        </section>
      )}
    </>
  );
}
