# Quan hệ dữ liệu v0.2 — phần lõi

Ngày 03/10/2026. Đi cùng DATABASE-DESIGN-v0.2.md và DATABASE-LAYOUT-v0.2.json. References dưới đây phải được BE enforce, không phải MongoDB tự bảo đảm foreign keys. Đã có 12 models tại BE; chưa tạo database/index hoặc triển khai các giao dịch nghiệp vụ.

```mermaid
erDiagram
    USERS ||--o{ AUTH_IDENTITIES : userId
    USERS ||--o{ SESSIONS : userId
    USERS ||--o{ AUTH_TOKENS : userId
    USERS ||--o{ WORKSPACES : ownerId
    USERS ||--o{ WORKSPACE_MEMBERSHIPS : userId
    WORKSPACES ||--o{ WORKSPACE_MEMBERSHIPS : workspaceId
    WORKSPACES ||--o{ WORKSPACE_INVITATIONS : workspaceId
    WORKSPACES ||--o{ PROJECTS : workspaceId
    PROJECTS ||--o{ TASKS : projectId
    USERS ||--o{ TASKS : createdBy
    USERS o|--o{ TASKS : assigneeId
    TASKS ||--o{ TASK_COMMENTS : taskId
    USERS ||--o{ TASK_COMMENTS : authorId
    USERS ||--o{ NOTIFICATIONS : recipientId
    WORKSPACES ||--o{ NOTIFICATIONS : workspaceId
    USERS o|--o{ EMAIL_OUTBOX : userId

    USERS {
        ObjectId _id PK
        string emailCanonical UK
        string displayName
        string passwordHash_nullable
        object avatar_google_or_initials
        date emailVerifiedAt_nullable
        object emailPreferences
        string locale_nullable
        object termsAcceptance
    }
    AUTH_IDENTITIES {
        ObjectId _id PK
        ObjectId userId FK
        string provider_google
        string providerSubject
    }
    SESSIONS {
        ObjectId _id PK
        ObjectId userId FK
        int authVersionAtIssue
        date expiresAt
        date revokedAt_nullable
    }
    AUTH_TOKENS {
        ObjectId _id PK
        ObjectId userId FK
        string purpose
        string tokenHash UK
        date expiresAt
        date usedAt_nullable
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
        date expiresAt
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
        ObjectId assigneeId_nullable FK
        string title
        RichText description
        string status
        date dueAt_nullable
        date deletedAt_nullable
        int version
    }
    TASK_COMMENTS {
        ObjectId _id PK
        ObjectId workspaceId FK
        ObjectId taskId FK
        ObjectId authorId FK
        RichText content
        date deletedAt_nullable
        int version
    }
    NOTIFICATIONS {
        ObjectId _id PK
        ObjectId recipientId FK
        ObjectId workspaceId FK
        string eventId
        string category
        object payload_private
        date readAt_nullable
    }
    EMAIL_OUTBOX {
        ObjectId _id PK
        ObjectId userId_nullable FK
        string eventId
        string recipientKey_private
        string state
        date nextAttemptAt
        string leaseToken_private
    }
```

Suffix `_nullable`/`_private` là ghi chú diagram, không tên field DB; layout JSON giữ tên chính xác. Sơ đồ rút gọn trường/quan hệ; references workspaceId/parent ở Task/Comment và các target references đầy đủ ở layout.

Owner nằm ở workspaces.ownerId, membership role tính khi truy cập. RichText/settings/Terms embedded, không collection. Sessions chọn một credential variant sau khi chốt auth, sơ đồ không ép JWT hoặc cookie.

workspace_announcements/operation_keys nằm ở mục mở rộng chờ phase/policy của thiết kế, không trong ERD lõi. Storage/resources là Upcoming. Không mảng attachments, file object hoặc upload avatar trong lõi hiện tại.
