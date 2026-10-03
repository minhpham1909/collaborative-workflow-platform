# Sơ đồ quan hệ DB v0.1

Sơ đồ này là lịch sử trước khi tách phạm vi lõi; dùng [ERD v0.2](DATABASE-ERD-v0.2.md) và [layout v0.2](DATABASE-LAYOUT-v0.2.json) cho thiết kế hiện tại.

Ngày 03/10/2026. Sơ đồ của DATABASE-DESIGN-v0.1.md; references là quan hệ service bảo đảm, không phải foreign-key enforcement tự động của MongoDB. Chưa tạo models/index/database.

```mermaid
erDiagram
    USERS ||--o{ WORKSPACES : ownerId
    USERS ||--o{ WORKSPACE_MEMBERSHIPS : userId
    WORKSPACES ||--o{ WORKSPACE_MEMBERSHIPS : workspaceId
    WORKSPACES ||--o{ WORKSPACE_INVITATIONS : workspaceId
    USERS ||--o{ WORKSPACE_INVITATIONS : createdBy
    WORKSPACES ||--o{ PROJECTS : workspaceId
    PROJECTS ||--o{ TASKS : projectId
    WORKSPACES ||--o{ TASKS : workspaceId
    USERS ||--o{ TASKS : createdBy
    USERS o|--o{ TASKS : assigneeId
    TASKS ||--o{ TASK_COMMENTS : taskId
    USERS ||--o{ TASK_COMMENTS : authorId
    USERS ||--o{ NOTIFICATIONS : recipientId
    WORKSPACES ||--o{ NOTIFICATIONS : workspaceId
    USERS ||--o{ SESSIONS : userId
    USERS ||--o{ AUTH_TOKENS : userId
    USERS ||--o{ AUTH_IDENTITIES : userId
    WORKSPACES ||--o{ WORKSPACE_ANNOUNCEMENTS : workspaceId
    USERS ||--o{ WORKSPACE_ANNOUNCEMENTS : createdBy
    USERS o|--o{ EMAIL_OUTBOX : userId
    USERS ||--o{ OPERATION_KEYS : userId

    USERS {
        ObjectId _id PK
        string emailCanonical UK
        string displayName
        string passwordHash
        date emailVerifiedAt
        object emailPreferences
        string locale
    }
    WORKSPACES {
        ObjectId _id PK
        ObjectId ownerId FK
        string name
        RichText description
        int version
        int mutationRevision
    }
    WORKSPACE_MEMBERSHIPS {
        ObjectId _id PK
        ObjectId workspaceId FK
        ObjectId userId FK
        string state
        int membershipGeneration
        object emailOverrides
    }
    WORKSPACE_INVITATIONS {
        ObjectId _id PK
        ObjectId workspaceId FK
        ObjectId createdBy FK
        string type
        string tokenHash UK
        string emailCanonical
        date expiresAt
        date revokedAt
        date acceptedAt
    }
    PROJECTS {
        ObjectId _id PK
        ObjectId workspaceId FK
        string name
        RichText description
        string state
        int version
    }
    TASKS {
        ObjectId _id PK
        ObjectId workspaceId FK
        ObjectId projectId FK
        ObjectId createdBy FK
        ObjectId assigneeId FK
        string title
        RichText description
        string status
        date dueAt
        date deletedAt
        int version
    }
    TASK_COMMENTS {
        ObjectId _id PK
        ObjectId workspaceId FK
        ObjectId taskId FK
        ObjectId authorId FK
        RichText content
        date deletedAt
        int version
    }
    NOTIFICATIONS {
        ObjectId _id PK
        ObjectId recipientId FK
        ObjectId workspaceId FK
        string eventId
        string category
        object payload
        date readAt
    }
    SESSIONS {
        ObjectId _id PK
        ObjectId userId FK
        string credentialHash
        date expiresAt
        date revokedAt
    }
    AUTH_TOKENS {
        ObjectId _id PK
        ObjectId userId FK
        string purpose
        string tokenHash UK
        date expiresAt
        date usedAt
    }
    AUTH_IDENTITIES {
        ObjectId _id PK
        ObjectId userId FK
        string provider
        string providerSubject
    }
    WORKSPACE_ANNOUNCEMENTS {
        ObjectId _id PK
        ObjectId workspaceId FK
        string title
        RichText content
        date pinnedAt
        date deletedAt
        int version
    }
    EMAIL_OUTBOX {
        ObjectId _id PK
        ObjectId userId FK
        string eventId
        string recipientKey
        string state
        date nextAttemptAt
    }
    OPERATION_KEYS {
        ObjectId _id PK
        ObjectId userId FK
        string operation
        string keyHash
        string requestHash
        ObjectId resultRef
    }
```

Diagram chỉ hiển thị fields quan trọng; data dictionary chứa nullable/default/private/timestamps đầy đủ. `credentialHash` trong sessions là ứng viên session-cookie; JWT mode dùng refresh fields khác. `operation_keys` còn phụ thuộc scope idempotency nhóm 6.

`RichText` là embedded object dùng chung, không collection. User settings và membership overrides cũng embedded. `Owner` là quyền tính từ Workspace.ownerId và membership active, không collection hoặc role thứ hai lưu song song.

Đọc task hierarchy theo Project → Workspace; workspaceId denormalized ở Task/Comment phải khớp parent. Diagram không có nghĩa User/Workspace purge cascade đã được duyệt.
