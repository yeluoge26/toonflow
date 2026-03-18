import { Request, Response, NextFunction } from "express";
import u from "@/utils";

// Role definitions
export type Role = "admin" | "editor" | "viewer";

export interface Permission {
  resource: string; // 'project' | 'script' | 'storyboard' | 'video' | 'settings' | 'user'
  actions: string[]; // 'create' | 'read' | 'update' | 'delete' | 'publish'
}

// Role-permission mapping
const rolePermissions: Record<Role, Permission[]> = {
  admin: [{ resource: "*", actions: ["*"] }],
  editor: [
    { resource: "project", actions: ["create", "read", "update"] },
    { resource: "script", actions: ["create", "read", "update"] },
    { resource: "storyboard", actions: ["create", "read", "update"] },
    { resource: "video", actions: ["create", "read", "update"] },
    { resource: "settings", actions: ["read"] },
    { resource: "user", actions: ["read"] },
  ],
  viewer: [
    { resource: "project", actions: ["read"] },
    { resource: "script", actions: ["read"] },
    { resource: "storyboard", actions: ["read"] },
    { resource: "video", actions: ["read"] },
  ],
};

// Check if a role has permission for a resource action
export function hasPermission(role: Role, resource: string, action: string): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;

  return permissions.some((p) => {
    const resourceMatch = p.resource === "*" || p.resource === resource;
    const actionMatch = p.actions.includes("*") || p.actions.includes(action);
    return resourceMatch && actionMatch;
  });
}

// Middleware: require specific permission
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).send({ message: "未登录" });
    }

    // Get user role from database
    const userData = await u.db("t_user").where("id", user.id).select("role").first();
    const role = (userData?.role as Role) || "viewer";

    if (!hasPermission(role, resource, action)) {
      return res.status(403).send({
        message: "权限不足",
        required: `${resource}:${action}`,
        currentRole: role,
      });
    }

    next();
  };
}

// Middleware: require admin role
export function requireAdmin() {
  return requirePermission("*", "*");
}
