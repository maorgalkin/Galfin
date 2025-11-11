import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Home, Users, UserPlus, Crown, Shield, User as UserIcon, Trash2, Plus, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFinance } from '../context/FinanceContext';
import * as HouseholdService from '../services/householdService';
import type { Household, HouseholdMember } from '../services/householdService';

interface HouseholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HouseholdSettingsModal: React.FC<HouseholdSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { familyMembers, addFamilyMember, updateFamilyMember } = useFinance();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  
  // Family member states
  const [activeTab, setActiveTab] = useState<'members' | 'family'>('members');
  const [newFamilyMemberName, setNewFamilyMemberName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [selectedHouseholdMember, setSelectedHouseholdMember] = useState<string>('');
  const [isAddingFamilyMember, setIsAddingFamilyMember] = useState(false);
  const [editingFamilyMemberId, setEditingFamilyMemberId] = useState<string | null>(null);
  const [editingHouseholdMemberId, setEditingHouseholdMemberId] = useState<string>('');

  const PRESET_COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  ];

  useEffect(() => {
    if (isOpen) {
      loadHouseholdData();
    }
  }, [isOpen]);

  const loadHouseholdData = async () => {
    setIsLoading(true);
    try {
      const [householdData, membersData, role] = await Promise.all([
        HouseholdService.getUserHousehold(),
        HouseholdService.getHouseholdMembers(),
        HouseholdService.getUserRole(),
      ]);
      
      setHousehold(householdData);
      setHouseholdName(householdData?.name || '');
      setMembers(membersData);
      setUserRole(role);
    } catch (error) {
      console.error('Error loading household data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!household || !householdName.trim()) return;
    
    try {
      await HouseholdService.updateHouseholdName(household.id, householdName.trim());
      setHousehold({ ...household, name: householdName.trim() });
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating household name:', error);
      alert('Failed to update household name');
    }
  };

  const handleAddFamilyMember = async () => {
    if (!newFamilyMemberName.trim()) {
      alert('Please enter a name');
      return;
    }

    setIsAddingFamilyMember(true);
    try {
      await addFamilyMember({
        name: newFamilyMemberName.trim(),
        color: selectedColor,
        household_member_id: selectedHouseholdMember || null,
      });
      
      setNewFamilyMemberName('');
      setSelectedHouseholdMember('');
      // Rotate to next color
      const currentIndex = PRESET_COLORS.indexOf(selectedColor);
      const nextIndex = (currentIndex + 1) % PRESET_COLORS.length;
      setSelectedColor(PRESET_COLORS[nextIndex]);
    } catch (error) {
      console.error('Error adding family member:', error);
      alert('Failed to add family member. Please try again.');
    } finally {
      setIsAddingFamilyMember(false);
    }
  };

  const handleUpdateFamilyMemberLink = async (familyMemberId: string, householdMemberId: string | null) => {
    const familyMember = familyMembers.find(fm => fm.id === familyMemberId);
    if (!familyMember) return;

    try {
      await updateFamilyMember(familyMemberId, {
        name: familyMember.name,
        color: familyMember.color,
        household_member_id: householdMemberId,
      });
      setEditingFamilyMemberId(null);
      setEditingHouseholdMemberId('');
    } catch (error) {
      console.error('Error updating family member link:', error);
      alert('Failed to update link');
    }
  };

  const handleInviteMember = async () => {
    if (!inviteUserId.trim()) {
      alert('Please enter a user ID');
      return;
    }

    try {
      await HouseholdService.inviteMemberByUserId(inviteUserId.trim(), inviteRole);
      await loadHouseholdData(); // Reload members
      setInviteUserId('');
      alert('Member invited successfully!');
    } catch (error: any) {
      console.error('Error inviting member:', error);
      alert(error.message || 'Failed to invite member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await HouseholdService.removeMember(memberId);
      await loadHouseholdData(); // Reload members
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      await HouseholdService.updateMemberRole(memberId, newRole);
      await loadHouseholdData(); // Reload members
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update member role');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-yellow-100 text-yellow-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800',
    };
    return colors[role as keyof typeof colors] || colors.member;
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const canManageMembers = userRole === 'owner' || userRole === 'admin';

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Home className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Household Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              App Users
            </button>
            <button
              onClick={() => setActiveTab('family')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'family'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Tag className="h-4 w-4 inline mr-2" />
              Family Members
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : activeTab === 'members' ? (
            <div className="space-y-6">
              {/* Household Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Household Name
                </label>
                {isEditingName ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateName}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setHouseholdName(household?.name || '');
                      }}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {household?.name || 'My Household'}
                    </span>
                    {canManageMembers && (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Members List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Members ({members.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {members.map((member) => {
                    const isCurrentUser = member.user_id === user?.id;
                    const canManageThisMember = canManageMembers && !isCurrentUser && member.role !== 'owner';

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getRoleIcon(member.role)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {isCurrentUser ? 'You' : (member.email || member.user_id.substring(0, 8))}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadge(member.role)}`}>
                                {member.role}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {canManageThisMember && (
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.id, e.target.value as 'admin' | 'member')}
                              className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              title="Remove member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invite Member */}
              {canManageMembers && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-4">
                    <UserPlus className="h-5 w-5 mr-2" />
                    Invite Member
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        User ID (for testing)
                      </label>
                      <input
                        type="text"
                        value={inviteUserId}
                        onChange={(e) => setInviteUserId(e.target.value)}
                        placeholder="Enter user ID to invite"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Email invitation coming in Phase 2. For now, use the user's UUID.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      onClick={handleInviteMember}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite Member
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Family Members Tab */
            <div className="space-y-6">
              {/* Add Family Member Form */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add Family Member</h3>
                
                <input
                  type="text"
                  value={newFamilyMemberName}
                  onChange={(e) => setNewFamilyMemberName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddFamilyMember()}
                  placeholder="Enter name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-3"
                  disabled={isAddingFamilyMember}
                />

                {/* Color Picker */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          selectedColor === color
                            ? 'border-gray-900 dark:border-white scale-110'
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Link to Household Member */}
                {members.filter(m => !familyMembers.some(fm => fm.household_member_id === m.id)).length > 0 && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Link to App User (Optional)
                    </label>
                    <select
                      value={selectedHouseholdMember}
                      onChange={(e) => setSelectedHouseholdMember(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">None</option>
                      {members
                        .filter(m => !familyMembers.some(fm => fm.household_member_id === m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.email || m.user_id.substring(0, 8)} ({m.role})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleAddFamilyMember}
                  disabled={isAddingFamilyMember || !newFamilyMemberName.trim()}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAddingFamilyMember ? 'Adding...' : 'Add Family Member'}
                </button>
              </div>

              {/* Family Members List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Current Family Members ({familyMembers.length})
                </h3>
                {familyMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No family members yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {familyMembers.map((member) => {
                      const linkedMember = member.household_member_id
                        ? members.find(m => m.id === member.household_member_id)
                        : null;
                      const isEditing = editingFamilyMemberId === member.id;
                      const availableForLink = members.filter(m => 
                        m.id === member.household_member_id || !familyMembers.some(fm => fm.household_member_id === m.id)
                      );

                      return (
                        <div
                          key={member.id}
                          className="flex items-center p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <div
                            className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                            style={{ backgroundColor: member.color }}
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{member.name}</span>
                            {isEditing ? (
                              <div className="mt-2">
                                <select
                                  value={editingHouseholdMemberId}
                                  onChange={(e) => setEditingHouseholdMemberId(e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="">No link</option>
                                  {availableForLink.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.email || m.user_id.substring(0, 8)} ({m.role})
                                    </option>
                                  ))}
                                </select>
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleUpdateFamilyMemberLink(member.id, editingHouseholdMemberId || null)}
                                    className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingFamilyMemberId(null);
                                      setEditingHouseholdMemberId('');
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  {linkedMember ? (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      Linked to {linkedMember.email || 'user'}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                      Not linked
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingFamilyMemberId(member.id);
                                    setEditingHouseholdMemberId(member.household_member_id || '');
                                  }}
                                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 ml-2"
                                >
                                  {linkedMember ? 'Edit Link' : 'Add Link'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Tip:</strong> Family members are labels for transactions. 
                  Optionally link them to app users for future features like filtering "My Transactions".
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HouseholdSettingsModal;
