# Profile Service — Database Schema (Simplified)

Namespace: `profile_service.Models`

## Audit fields

Every entity carries these (omitted from tables below):

| Field | Type | Nullable |
| ----- | ---- | -------- |
| Id | Guid | No (key) |
| CreatedAt | DateTimeOffset | No |
| UpdatedAt | DateTimeOffset | No |
| CreatedBy | Guid | Yes |
| UpdatedBy | Guid | Yes |

`IsDeleted` is present on many but not all entities, so it stays in each entity's own table.

---

## Identity & Access

### User

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| FirebaseUserId | string | No | |
| IsDeleted | bool | No | |
| IsApproved | bool | No | |
| DisplayName | string | No | |
| ProfileImage | string | Yes | |
| Biography | string | Yes | |
| Expertise | string | Yes | |
| Qualifications | string | Yes | |
| TeachingPhilosophy | string | Yes | |
| Email | string | No | |
| LoginType | string | Yes | |
| IsFirstLogin | bool | No | |
| RecaptchaVerified | bool | No | |
| IPAddress | string | No | |
| PasswordResetSentAt | DateTimeOffset | Yes | |
| PasswordResetTokenHash | string | Yes | |
| LastLoginAt | DateTimeOffset | Yes | |
| EmailVerification | bool | No | |
| VerificationToken | Guid | Yes | |
| EmailVerifiedAt | DateTimeOffset | Yes | |
| IsSharingEnabled | bool | No | |
| StripeAccountId | string | Yes | |
| IsActive | bool | No | |
| DeactivatedAt | DateTimeOffset | Yes | |
| DeactivatedBy | Guid | Yes | |
| DeactivationReason | string | Yes | |

Relations: `ConversationHistories`, `UserRoleScopes`, `PaymentMethods`, `LearnerProfiles`

### Role

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| RoleName | string | No | |
| Description | string | Yes | |
| IsSystemRole | bool | No | |
| IsDeleted | bool | No | |
| OrganizationId | Guid | Yes | FK → Organization |

Relations: `Organization`, `RolePermissions`, `UserRoleScopes`

### Permission

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| PermissionName | string | No | |
| IsDeleted | bool | No | |
| Description | string | Yes | |
| DisplayName | string | Yes | |
| ParentId | Guid | Yes | self-ref tree, FK → Permission (assumed) |
| Sorting | int | No | |
| IsSuperAdmin | bool | No | |

Relations: `Parent`, `Children`, `RolePermissions`

### RolePermission

Join table between Role and Permission.

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| RoleId | Guid | Yes | FK → Role |
| PermissionId | Guid | Yes | FK → Permission |
| IsDeleted | bool | No | |

Relations: `Role`, `Permission`

### UserRoleScope

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| UserId | Guid | Yes | FK → User |
| RoleId | Guid | Yes | FK → Role |
| CourseId | Guid | Yes | FK → Course |
| IsSharingEnabled | bool | No | |

Relations: `User`, `Role`, `Course`, `UserRoleOrganizations`

### UserRoleOrganization

Join table scoping a UserRoleScope to an Organization.

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| UserRoleScopeId | Guid | Yes | FK → UserRoleScope |
| OrganizationId | Guid | Yes | FK → Organization |
| AssignedAt | DateTimeOffset | No | |
| AllocatedCourseSeat | int | Yes | |

Relations: `UserRoleScope`, `Organization`

---

## Organization

### Organization

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| ParentId | Guid | Yes | self-ref tree, FK → Organization (assumed) |
| Name | string | No | |
| Slug | string | No | |
| Path | string | No | |
| Level | int | No | |
| IsActive | bool | No | |
| Address | string | Yes | |
| ContactPerson | string | Yes | |
| Phone | string | Yes | |
| AllocatedCourseSeat | int | Yes | |
| OrganizationImage | string | Yes | |
| UsedCourseSeat | int | Yes | |
| RegistrationNumber | string | Yes | |
| Country | string | Yes | |
| AllowExternalEmails | bool | No | |

Relations: `Parent`, `Children`, `UserRoleOrganizations`, `Contracts`, `Msas`, `OrganizationDomains`, `OrganizationInvitations`, `OrganizationThreshold`

### OrganizationDomain

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| OrganizationId | Guid | Yes | FK → Organization |
| Domain | string | No | |

Relations: `Organization`

### OrganizationThreshold

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| OrganizationId | Guid | Yes | FK → Organization |
| ThresholdPercentage | decimal | Yes | |
| LastNotifiedAt | DateTimeOffset | Yes | |

Relations: `Organization`, `ThresholdReceivers`

### OrganizationThresholdReceiver

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| ThresholdId | Guid | No | FK → OrganizationThreshold (assumed) |
| Email | string | No | |

Relations: `Threshold` (→ OrganizationThreshold)

### OrganizationInvitation

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| OrganizationId | Guid | Yes | FK → Organization |
| RoleId | Guid | Yes | FK → Role |
| InvitedEmail | string | No | |
| InvitedByUserId | Guid | No | FK → User (assumed) |
| InvitedUserId | Guid | Yes | FK → User (assumed) |
| FullName | string | Yes | |
| Designation | string | Yes | |
| Phone | string | Yes | |
| TokenHash | string | No | |
| IsSuperAdmin | bool | No | |
| Status | OrgInvitationStatus | No | enum |
| ExpiresAt | DateTimeOffset | No | |
| AcceptedAt | DateTimeOffset | Yes | |
| FirstAccessedAt | DateTimeOffset | Yes | |

Relations: `Organization`, `Role`, `InvitedUser` (→ User)

---

## Contracts & Billing

### Contract

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| OrganizationId | Guid | Yes | FK → Organization |
| ContractNumber | string | No | |
| StartDate | DateTimeOffset | No | |
| EndDate | DateTimeOffset | No | |
| ContractValue | decimal | No | |
| Currency | string | No | |
| CourseSeatCount | int | No | |
| IsActive | bool | No | |
| IsDeleted | bool | No | |
| MsaId | Guid | Yes | FK → Msa |
| ReferenceId | string | Yes | |
| ACV | decimal | Yes | |
| Years | int | Yes | |

Relations: `Organization`, `Msa`

### Msa

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| OrganizationId | Guid | Yes | FK → Organization |
| ReferenceId | string | No | |
| ExecutedDate | DateTimeOffset | No | |
| IsActive | bool | No | |
| IsDeleted | bool | No | |

Relations: `Organization`, `MsaDocuments`, `Contracts`

### MsaDocument

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| MsaId | Guid | Yes | FK → Msa |
| FilePath | string | No | |
| FileType | string | No | |
| FileName | string | No | |
| FileSize | int | No | |

Relations: `Msa`

### OrderFormDocument

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| OrderFormId | Guid | No | FK → Contract (assumed; nav `OrderForm` targets Contract) |
| FilePath | string | No | |
| FileType | string | No | |
| FileName | string | No | |
| FileSize | int | No | |

Relations: `OrderForm` (→ Contract)

### PaymentMethod

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| UserId | Guid | Yes | FK → User |
| CardNo | string | No | |
| ExpiredAt | DateTimeOffset | No | |
| Cvv | string | No | |
| IsDefault | bool | No | |

Relations: `User`

### CourseConfig

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Description | string | No | |
| CourseAllowance | int | No | |

No nav properties — standalone config entity.

---

## Course & Curriculum

### Course

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Name | string | No | |
| CourseCode | string | No | |
| Aims | string | Yes | |
| Description | string | Yes | |
| CourseDescription | string | Yes | |
| Logo | string | Yes | |
| Title | string | Yes | |
| HyperParameters | string | Yes | |
| WelcomeMessage | string | Yes | |
| IsFileUploadEnabled | bool | No | |
| IsConversationEnabled | bool | No | |
| IsDeleted | bool | No | |
| VectorEndpoint | string | Yes | |
| LlmModelId | Guid | No | FK → LLMModel (assumed) |
| IsRAG | bool | No | |
| StartDate | DateTimeOffset | Yes | |
| EndDate | DateTimeOffset | Yes | |
| RemainingDays | int | Yes | |
| IsPublished | bool | No | |
| DbType | DbType | No | enum |
| ProdCourseId | Guid | Yes | FK → Course (assumed, self-ref: sandbox→prod copy) |
| CoolTime | DateTimeOffset | Yes | |
| AcademicLevel | string | Yes | |
| StatusStartDate | DateTimeOffset | Yes | |
| Status | CourseStatus | No | enum |
| ChatbotThemeColor | string | Yes | |
| IsEnableChatbot | bool | No | |
| GenerationStatus | GenerationStatus | No | enum |
| OrganizationId | Guid | Yes | FK → Organization |

Relations: `LlmModel`, `Organization`, `CourseTopics`, `CourseMaterials`, `CoursePromptTemplates`, `CourseStarterMessages`, `ConversationHistories`, `UserRoleScopes`

### CourseTopic

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Name | string | No | |
| CourseId | Guid | Yes | FK → Course |
| IsAI | bool | No | |
| IsDeleted | bool | No | |
| BloomLevel | BloomLevel | No | enum |
| RubricLevel | RubricLevel | No | enum |
| BaselineOrder | int | Yes | |
| BaselineSuggestion | string | Yes | |

Relations: `Course`, `LearnerProfiles`, `QuestionBanks`, `Flashcards`

### CourseMaterial

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Description | string | Yes | |
| Name | string | No | |
| Transformer | string | Yes | |
| OERTextBook | OERTextBook | Yes | enum |
| WebsiteUrl | string | Yes | |
| MaterialPDF | string | Yes | |
| IndexingStatus | IndexingStatus | No | enum |
| VectorResponsePayload | string | Yes | |
| SourceKey | string | Yes | |
| ScanStatus | ScanStatus | No | enum |
| FileType | string | No | |
| FileSize | int | Yes | |
| RequiredAIPoints | decimal | Yes | |
| ScanContentReason | string | Yes | |
| FailedReason | string | Yes | |
| CourseId | Guid | Yes | FK → Course |

Relations: `Course`

### CoursePromptTemplate

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Title | string | Yes | |
| Body | string | Yes | |
| DisplayBody | string | Yes | |
| CourseId | Guid | Yes | FK → Course |
| Sorting | int | Yes | |
| IsSelected | bool | No | |
| IsDefault | bool | No | |
| Type | TemplateSource | No | enum |
| GlobalId | Guid | Yes | FK → OriginalPromptTemplate (assumed) |

Relations: `Course`

### CourseStarterMessage

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Message | string | No | |
| CourseId | Guid | Yes | FK → Course |

Relations: `Course`

### OriginalPromptTemplate

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Title | string | Yes | |
| Body | string | Yes | |
| DisplayBody | string | Yes | |
| Sorting | int | Yes | |

Global template pool; no nav properties. Referenced by `CoursePromptTemplate.GlobalId`.

### OriginalStarterMessage

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Message | string | No | |

Global starter-message pool; no nav properties.

### OriginalTopic

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Name | string | No | |
| BloomLevel | BloomLevel | No | enum |
| RubricLevel | RubricLevel | No | enum |

Global topic pool; no nav properties.

---

## Quizzes & Assessment

### Flashcard

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| CourseTopicId | Guid | Yes | FK → CourseTopic |
| Question | string | No | |
| Answer | string | No | |
| IsDisabled | bool | No | |
| IsDeleted | bool | No | |

Relations: `CourseTopic`

### QuestionBank

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| CourseTopicId | Guid | Yes | FK → CourseTopic |
| Question | string | No | |
| QuestionType | string | No | |
| Options | string[] | Yes | |
| QuizAnswer | string[] | Yes | |
| BloomLevel | BloomLevel | No | enum |
| RubricLevel | RubricLevel | No | enum |
| Explanation | string | No | |
| Reference | string | No | |
| Hint | string | Yes | |
| IsDisabled | bool | No | |

Relations: `QuizQuestions`, `CourseTopic`

### Quiz

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| UserId | Guid | No | FK → User (assumed) |
| CourseId | Guid | No | FK → Course (assumed) |
| QuizTitle | string | No | |
| Duration | Duration | No | |
| NumberOfQuestions | int | No | |
| RubricLevel | RubricLevel | No | enum |
| Score | int | No | |
| ResultTitle | string | Yes | |
| ResultDescription | string | Yes | |
| TopicToImprove | string[] | Yes | |
| AttemptStatus | QuizAttemptState | No | enum |
| CurrentQuestionIndex | int | No | |
| LastSavedAt | DateTimeOffset | No | |
| TimeSpent | Duration | No | |

Relations: `QuizQuestions`

### QuizQuestion

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| QuizId | Guid | Yes | FK → Quiz |
| QuestionId | Guid | No | FK → QuestionBank (assumed; nav `Question`) |
| LearnerAnswer | string[] | Yes | |
| IsCorrect | bool | No | |

Relations: `Quiz`, `Question` (→ QuestionBank)

### LearnerProfile

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| UserId | Guid | No | FK → User (assumed) |
| CourseTopicId | Guid | Yes | FK → CourseTopic |
| BloomLevel | BloomLevel | No | enum |
| RubricLevel | RubricLevel | No | enum |
| PeakBloomLevel | BloomLevel | Yes | enum |
| PeakRubricLevel | RubricLevel | Yes | enum |
| Suggestions | string | Yes | |

Relations: `CourseTopic`

---

## AI & Conversation

### LLMModel

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Name | string | No | |
| ModelArnId | string | No | |
| Description | string | Yes | |
| DefaultHyperParameters | string | Yes | |
| IsDeleted | bool | No | |

No nav properties declared; referenced by `Course.LlmModel`.

### ConversationHistory

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| ConversationTitle | string | No | |
| UserId | Guid | Yes | FK → User |
| CourseTemplateId | Guid | Yes | no matching nav or entity in schema — purpose unclear, assumed course-template reference |
| CourseId | Guid | Yes | FK → Course |

Relations: `User`, `Course`, `ConversationDetails`

### ConversationDetail

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| Message | string | Yes | |
| SenderType | SenderType | No | enum |
| Image | string | Yes | |
| RequestPayload | string | Yes | |
| ResponsePayload | string | Yes | |
| Reaction | ReactionType | No | enum |
| Reason | string | Yes | |
| ConversationHistoriesId | Guid | No | FK → ConversationHistory (assumed) |

Relations: `ConversationHistory`

---

## Notifications & Audit

### InvitationMailList

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| InviterId | Guid | No | FK → User (assumed) |
| CourseId | Guid | Yes | FK → Course (assumed) |
| FirstAccessedAt | DateTimeOffset | Yes | |
| InvitedUserId | Guid | Yes | FK → User (assumed) |
| Email | string | No | |
| Status | InvitationStatus | No | enum |

No nav properties declared.

### EmailNotificationLog

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| RecipientId | Guid | Yes | FK → User (assumed; nav `Recipient`) |
| Email | string | No | |
| TemplateType | string | No | |
| ReferenceId | Guid | Yes | |
| Status | string | No | |
| SentAt | DateTimeOffset | Yes | |

Relations: `Recipient` (→ User)

### SuperAdminAuditHistory

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| OrganizationId | Guid | Yes | FK → Organization |
| InvitationId | Guid | Yes | FK → OrganizationInvitation (assumed; nav `Invitation`) |
| UserId | Guid | Yes | FK → User |
| InvitedEmail | string | No | |
| FullName | string | No | |
| Designation | string | Yes | |
| Phone | string | Yes | |
| InvitedAt | DateTimeOffset | No | |
| JoinedAt | DateTimeOffset | Yes | |
| RemovedAt | DateTimeOffset | Yes | |
| IsCurrent | bool | No | |

Relations: `Organization`, `Invitation` (→ OrganizationInvitation), `User`

### UserRoleAuditHistory

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| OrganizationId | Guid | Yes | FK → Organization |
| AffectedUserId | Guid | No | FK → User (assumed) |
| ChangedByUserId | Guid | No | FK → User (assumed) |
| FromRoleId | Guid | Yes | FK → Role (assumed) |
| ToRoleId | Guid | Yes | FK → Role (assumed) |
| CourseTransferredToUserId | Guid | Yes | FK → User (assumed) |
| ChangedAt | DateTimeOffset | No | |

Relations: `Organization`, `AffectedUser` (→ User), `ChangedByUser` (→ User), `FromRole` (→ Role), `ToRole` (→ Role), `CourseTransferredToUser` (→ User), `CourseTransfers`

### UserRoleAuditCourseTransfer

| Field | Type | Nullable | Note |
| ----- | ---- | -------- | ---- |
| AuditId | Guid | No | FK → UserRoleAuditHistory (assumed; nav `Audit`) |
| CourseId | Guid | Yes | FK → Course |

Relations: `Audit` (→ UserRoleAuditHistory), `Course`

---

## Enums

| Enum | Values |
| ---- | ------ |
| DbType | SandBox(0), Production(1) |
| CourseStatus | Draft(0), Create(1), Active(2), Suspended(3), Terminated(4), Inactive(5), Archived(6) |
| GenerationStatus | NotStarted(0), InProgress(1), Completed(2), Failed(3) |
| OrgInvitationStatus | Pending(0), Accepted(1), Rejected(2), Expired(3), Cancelled(4), Removed(5), Deactivated(6) |
| BloomLevel | Remembering(0), Understanding(1), Applying(2), Analyzing(3), Evaluating(4), Creating(5) |
| RubricLevel | Beginning(0), Developing(1), Proficient(2), Exemplary(3) |
| QuizAttemptState | Generating(0), InProgress(1), Paused(2), TimeUp(3), AnalyzingPerformance(4), Completed(5) |
| OERTextBook | Biology(0), Chemistry(1), Physics(2), Psychology(3), Mathematics(4) |
| IndexingStatus | NotStarted(0), InProgress(1), Completed(2), Failed(3) |
| ScanStatus | NotStarted(0), Scanning(1), Clean(2), Warning(3), Rejected(4), Failed(5) |
| TemplateSource | global(0), local(1) |
| SenderType | LLM(0), User(1) |
| ReactionType | Default(0), Like(1), Dislike(2) |
| InvitationStatus | Pending(0), Accepted(1), Rejected(2), Expired(3) |

---

## Entity Sets

| Set | Entity Type |
| --- | ----------- |
| Users | User |
| Roles | Role |
| Permissions | Permission |
| RolePermissions | RolePermission |
| UserRoleScopes | UserRoleScope |
| LLMModels | LLMModel |
| ConversationDetails | ConversationDetail |
| ConversationHistories | ConversationHistory |
| Courses | Course |
| CourseMaterials | CourseMaterial |
| CoursePromptTemplates | CoursePromptTemplate |
| CourseStarterMessages | CourseStarterMessage |
| CourseTopics | CourseTopic |
| Flashcards | Flashcard |
| OriginalPromptTemplates | OriginalPromptTemplate |
| OriginalStarterMessages | OriginalStarterMessage |
| OriginalTopics | OriginalTopic |
| PaymentMethods | PaymentMethod |
| CourseConfigs | CourseConfig |
| Organizations | Organization |
| Contracts | Contract |
| UserRoleOrganizations | UserRoleOrganization |
| InvitationMailLists | InvitationMailList |
| Quizzes | Quiz |
| QuizQuestions | QuizQuestion |
| QuestionBanks | QuestionBank |
| LearnerProfiles | LearnerProfile |
| Msas | Msa |
| MsaDocuments | MsaDocument |
| OrderFormDocuments | OrderFormDocument |
| OrganizationDomains | OrganizationDomain |
| OrganizationInvitations | OrganizationInvitation |
| EmailNotificationLogs | EmailNotificationLog |
| OrganizationThresholds | OrganizationThreshold |
| OrganizationThresholdReceivers | OrganizationThresholdReceiver |
| SuperAdminAuditHistories | SuperAdminAuditHistory |
| UserRoleAuditHistories | UserRoleAuditHistory |
| UserRoleAuditCourseTransfers | UserRoleAuditCourseTransfer |

---

## Key Relationships

- **User** ↔ **UserRoleScope** ↔ **Role** — a user's role, optionally scoped to one `Course`.
- **UserRoleScope** ↔ **UserRoleOrganization** ↔ **Organization** — scopes that role assignment to an org.
- **Role** ↔ **RolePermission** ↔ **Permission** — join table granting permissions to roles.
- **Permission** self-ref tree via `ParentId` / `Children` — hierarchical permission tree.
- **Organization** self-ref tree via `ParentId` / `Children` — multi-tenant org hierarchy.
- **Organization** → **Course** — courses belong to an organization.
- **Course** → **CourseTopic** → **QuestionBank** / **Flashcard** / **LearnerProfile** — curriculum breakdown and per-learner mastery tracking.
- **Course** → **LLMModel** — each course is bound to one LLM model config.
- **User** → **ConversationHistory** → **ConversationDetail** — chat sessions and their turn-by-turn messages.
- **Quiz** → **QuizQuestion** → **QuestionBank** — a quiz attempt's questions, each drawn from the question bank.
- **Organization** → **Contract** and **Organization** → **Msa**; **Msa** → **Contract** (via `MsaId`) and **Msa** → **MsaDocument** — billing/legal chain: MSA governs one or more contracts.
- **Contract** → **OrderFormDocument** — nav named `OrderForm`, real target type is `Contract`.
- **Organization** → **OrganizationThreshold** → **OrganizationThresholdReceiver** — seat-usage alerting.
- **Organization** → **OrganizationInvitation** / **OrganizationDomain** — org onboarding and allowed email domains.
- **OriginalPromptTemplate** / **OriginalStarterMessage** / **OriginalTopic** are global template pools with no FKs; `CoursePromptTemplate.GlobalId` links back to `OriginalPromptTemplate` (assumed, undeclared).
- **SuperAdminAuditHistory** and **UserRoleAuditHistory** → **UserRoleAuditCourseTransfer** — audit trail of org admin and role/course changes over time.
