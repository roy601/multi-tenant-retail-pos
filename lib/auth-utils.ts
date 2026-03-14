// lib/auth-utils.ts
// Authentication and authorization utilities with improved error handling

import { SupabaseClient } from '@supabase/supabase-js';
import type { User, UserRole, Organization, UserOrganization, Permission } from '@/types/database';
import { hasPermission as checkPermission } from '@/types/database';

/**
 * Get current user's profile information
 */
export async function getCurrentUser(supabase: SupabaseClient): Promise<User | null> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.log('No authenticated user found');
      return null;
    }

    console.log('✅ Auth user found:', authUser.email);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('❌ Error fetching user profile:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      // Provide specific guidance based on error type
      if (error.code === '42P01') {
        console.error('🔧 SOLUTION: Run COMPLETE-MIGRATION.sql - users table does not exist');
      } else if (error.code === 'PGRST116') {
        console.error('🔧 SOLUTION: Run FIX-ERROR.sql - user not found in users table');
        console.error(`   User email: ${authUser.email}, User ID: ${authUser.id}`);
      } else if (error.message?.includes('permission denied') || error.code === '42501') {
        console.error('🔧 SOLUTION: Run FIX-ERROR.sql - RLS is blocking access');
      }

      return null;
    }

    if (!data) {
      console.error('❌ No user profile found for:', authUser.email);
      console.error('🔧 SOLUTION: Run FIX-ERROR.sql to create user profile');
      return null;
    }

    console.log('✅ User profile loaded:', data.email, `(${data.role})`);
    return data as User;
  } catch (error) {
    console.error('❌ Unexpected error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Get current user's organization
 */
export async function getCurrentUserOrganization(supabase: SupabaseClient): Promise<Organization | null> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        organizations (*)
      `)
      .eq('user_id', authUser.id)
      .limit(1);

    if (error) {
      console.error('❌ Error fetching organization:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }

    if (!data || data.length === 0 || !data[0].organizations) {
      console.log('ℹ️ No organization found for user');
      return null;
    }

    // Handle both single object and array responses
    const org = Array.isArray(data[0].organizations)
      ? data[0].organizations[0]
      : data[0].organizations;

    console.log('✅ Organization loaded:', org.name);
    return org as Organization;
  } catch (error) {
    console.error('❌ Error in getCurrentUserOrganization:', error);
    return null;
  }
}

/**
 * Get current user's role
 */
export async function getCurrentUserRole(supabase: SupabaseClient): Promise<UserRole | null> {
  try {
    const user = await getCurrentUser(supabase);
    return user?.role || null;
  } catch (error) {
    console.error('Error in getCurrentUserRole:', error);
    return null;
  }
}

/**
 * Check if current user has a specific permission
 */
export async function userHasPermission(
  supabase: SupabaseClient,
  permission: Permission
): Promise<boolean> {
  try {
    const role = await getCurrentUserRole(supabase);
    if (!role) return false;

    return checkPermission(role, permission);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if current user is owner
 */
export async function isOwner(supabase: SupabaseClient): Promise<boolean> {
  try {
    const role = await getCurrentUserRole(supabase);
    return role === 'owner';
  } catch (error) {
    console.error('Error checking if owner:', error);
    return false;
  }
}

/**
 * Check if current user is manager
 */
export async function isManager(supabase: SupabaseClient): Promise<boolean> {
  try {
    const role = await getCurrentUserRole(supabase);
    return role === 'manager';
  } catch (error) {
    console.error('Error checking if manager:', error);
    return false;
  }
}

/**
 * Get all users in a specific organization
 */
export async function getOrganizationUsers(
  supabase: SupabaseClient,
  organizationId?: string
): Promise<User[]> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return [];

    const profile = await getCurrentUser(supabase);
    if (!profile || profile.role !== 'owner') {
      console.warn('Only owners can view organization users');
      return [];
    }

    // If no organizationId provided, we can't filter correctly
    if (!organizationId) {
      console.warn('No organization ID provided to getOrganizationUsers');
      return [];
    }

    // Get all users linked to this specific organization
    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        users (*)
      `)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching organization users:', error);
      return [];
    }

    // Extract users from the response
    const users = (data || [])
      .map(item => Array.isArray(item.users) ? item.users[0] : item.users)
      .filter(Boolean) as User[];

    console.log(`✅ Loaded ${users.length} users from organization ${organizationId}`);
    return users;
  } catch (error) {
    console.error('Error in getOrganizationUsers:', error);
    return [];
  }
}

/**
 * Create a new user in a specific organization
 */
export async function createUser(
  supabase: SupabaseClient,
  userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role: UserRole;
    organization_id?: string;
  }
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Check if current user is owner
    const owner = await isOwner(supabase);
    if (!owner) {
      return { success: false, error: 'Only owners can create users' };
    }

    const orgId = userData.organization_id;
    if (!orgId) {
      return { success: false, error: 'Organization ID is required' };
    }

    console.log('Creating user via RPC for org:', orgId);

    // Use RPC to create user without changing current session
    const { data, error: rpcError } = await supabase.rpc('admin_create_user', {
      p_email: userData.email,
      p_password: userData.password,
      p_full_name: userData.full_name,
      p_phone: userData.phone || null,
      p_role: userData.role,
      p_organization_id: orgId
    });

    if (rpcError) {
      console.error('RPC creation failed:', rpcError);
      return { success: false, error: rpcError.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.message || 'Failed to create user' };
    }

    console.log('✅ User created successfully via admin RPC');
    return { success: true };
  } catch (error) {
    console.error('Error in createUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update user information
 */
export async function updateUser(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Pick<User, 'full_name' | 'phone' | 'role' | 'is_active'>>,
  organizationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const owner = await isOwner(supabase);
    if (!owner) {
      return { success: false, error: 'Only owners can update users' };
    }

    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('User update failed:', error);
      return { success: false, error: error.message };
    }

    // If role was updated, also update in user_organizations for the specific shop
    if (updates.role && organizationId) {
      await supabase
        .from('user_organizations')
        .update({ role: updates.role })
        .eq('user_id', userId)
        .eq('organization_id', organizationId);
    }

    console.log('✅ User updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in updateUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete user from organization
 */
export async function deleteUser(
  supabase: SupabaseClient,
  userId: string,
  organizationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const owner = await isOwner(supabase);
    if (!owner) {
      return { success: false, error: 'Only owners can delete users' };
    }

    // Get current user to prevent self-deletion
    const currentUser = await getCurrentUser(supabase);
    if (currentUser?.id === userId) {
      return { success: false, error: 'You cannot delete yourself' };
    }

    if (!organizationId) {
      return { success: false, error: 'Organization ID is required' };
    }

    // Remove user from the specific organization
    const { error } = await supabase
      .from('user_organizations')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('User deletion failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ User removed from organization successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update organization settings
 */
export async function updateOrganization(
  supabase: SupabaseClient,
  updates: Partial<Pick<Organization, 'name' | 'address' | 'phone' | 'email' | 'tax_id'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const owner = await isOwner(supabase);
    if (!owner) {
      return { success: false, error: 'Only owners can update organization settings' };
    }

    const org = await getCurrentUserOrganization(supabase);
    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    const { error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', org.id);

    if (error) {
      console.error('Organization update failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Organization updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in updateOrganization:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(supabase: SupabaseClient): Promise<void> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return;

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authUser.id);
  } catch (error) {
    // Silent fail - not critical
    console.debug('Could not update last login:', error);
  }
}