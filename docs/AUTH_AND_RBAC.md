# Authentication & Centralized RBAC Specification

## 1. Authentication Strategy
- **Password Hashing**: Salted bcrypt (salt rounds: 12).
- **Access Tokens**: Short-lived JSON Web Tokens (15 minutes).
- **Refresh Tokens**: Cryptographically secure random 40-byte hex strings hashed via SHA-256 before database storage.
- **Session Lifespan**: 7 days with automatic token rotation upon each refresh request.
- **Revocation**: Instant logout updates `revokedAt` timestamp on the session; subsequent refresh requests fail immediately.

## 2. Centralized 15-Role RBAC Model
Roles map to granular permissions via `permissions.matrix.ts`:
```
Role -> Permissions -> Resource -> Action
```

### Phase 1 Proven Stakeholder Roles
1. **Citizen**:
   - `challenge:create`, `challenge:view`, `challenge:update`, `challenge:submit`, `evidence:upload`, `org:create`, `org:view`
2. **Government Officer**:
   - `challenge:view`, `challenge:review`, `challenge:request_info`, `challenge:approve`, `challenge:reject`, `org:view`, `audit:view`
3. **University Admin**:
   - `challenge:view`, `org:view`, `org:update`, `org:verify_submit`
4. **System Admin**:
   - All permissions including `system:manage`.

### Architectural Roles (Defined in RBAC Matrix for Future Slices)
Community Group, PRI, ULB, Government Department, Faculty, Student, Research Assistant, Industry Partner, Startup, MSME, CSR Organization.