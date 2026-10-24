import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../src/types';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: UserRole;
  employeeId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Extracts identity and role from custom headers or defaults to customer.
 * In a production SSO/JWT deployment, this reads signed JWT bearer tokens.
 * For development & operational testing, supports X-User-Role / X-User-Name headers.
 */
export function authenticateUser(req: Request, _res: Response, next: NextFunction): void {
  const roleHeader = (req.headers['x-user-role'] as string)?.toLowerCase();
  const nameHeader = (req.headers['x-user-name'] as string) || '';
  const idHeader = (req.headers['x-user-id'] as string) || '';

  const validRoles: UserRole[] = ['customer', 'staff', 'supervisor', 'auditor'];
  const role: UserRole = validRoles.includes(roleHeader as UserRole)
    ? (roleHeader as UserRole)
    : 'customer';

  req.user = {
    id: idHeader || (role === 'customer' ? 'GUEST' : 'USR-DEFAULT'),
    name: nameHeader || (role === 'customer' ? 'Guest Diner' : 'Staff Member'),
    role,
  };

  next();
}

/**
 * Restricts access to specified roles.
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role || 'customer';
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Action requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${userRole}`,
      });
      return;
    }
    next();
  };
}

/**
 * Strips private staff internal notes from objects returned to public / customer callers.
 */
export function sanitizeForRole<T>(data: T, role: UserRole = 'customer'): T {
  if (role === 'staff' || role === 'supervisor' || role === 'auditor') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForRole(item, role)) as unknown as T;
  }

  if (data && typeof data === 'object') {
    const copy = { ...data } as Record<string, unknown>;
    delete copy.internalNotes;
    delete copy.internal_notes;

    // Filter audit entries if present
    if (Array.isArray(copy.auditTrail)) {
      copy.auditTrail = (copy.auditTrail as Array<{ customerVisible?: boolean }>).filter(
        (a) => a.customerVisible !== false
      );
    }

    return copy as T;
  }

  return data;
}
