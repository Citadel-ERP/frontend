/**
 * Utility functions for Module Access Management
 */

import { AVATAR_COLORS } from './constants';

/**
 * Get initials from full name
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Get consistent color based on ID
 */
export const getAvatarColor = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/**
 * Group employees by city
 */
export const groupEmployeesByCity = (employees: any[]): { city: string; employees: any[] }[] => {
  const groups: { [key: string]: any[] } = {};
  
  employees.forEach(emp => {
    // Extract city from employee data (customize based on your data structure)
    const city = emp.office?.address?.city || 
                 emp.city || 
                 (emp.employee_id?.charAt(0) === 'A' ? 'Mumbai' : 
                  emp.employee_id?.charAt(0) === 'B' ? 'Delhi' : 
                  emp.employee_id?.charAt(0) === 'C' ? 'Bangalore' : 'Other Cities');
    
    if (!groups[city]) {
      groups[city] = [];
    }
    groups[city].push(emp);
  });
  
  // Sort employees within each city
  Object.keys(groups).forEach(city => {
    groups[city].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  });
  
  // Convert to array and sort cities
  return Object.entries(groups)
    .map(([city, employees]) => ({ city, employees }))
    .sort((a, b) => a.city.localeCompare(b.city));
};

/**
 * Filter employees by search query
 */
export const filterEmployeesByQuery = (employees: any[], query: string): any[] => {
  if (!query.trim()) return employees;
  
  const lowerQuery = query.toLowerCase();
  return employees.filter(
    emp =>
      emp.full_name?.toLowerCase().includes(lowerQuery) ||
      emp.employee_id?.toLowerCase().includes(lowerQuery) ||
      emp.designation?.toLowerCase().includes(lowerQuery) ||
      emp.email?.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Format date for display
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};