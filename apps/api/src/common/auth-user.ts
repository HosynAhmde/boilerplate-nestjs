/** What the auth guard attaches to `request.user`. */
export interface AuthUser {
  id: string;
  roleId: string;
  sessionId: string;
  fullName: string;
  mobile: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
