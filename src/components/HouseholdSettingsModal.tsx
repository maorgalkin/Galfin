import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Home, Users, UserPlus, Crown, Shield, User as UserIcon, Trash2, Copy, Check, LogOut, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as HouseholdService from '../services/householdService';
import type { Household, HouseholdMember } from '../services/householdService';
import { JoinHouseholdModal } from './JoinHouseholdModal';
import { LeaveHouseholdModal } from './LeaveHouseholdModal';

interface HouseholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HouseholdSettingsModal: React.FC<HouseholdSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  
  // Invitation code states
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Modal states
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHouseholdData();
      loadInvitationCode();
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

  const loadInvitationCode = async () => {
    try {
      const code = await HouseholdService.generateInvitationCode();
      setInvitationCode(code);
    } catch (error) {
      console.error('Error generating invitation code:', error);
      setInvitationCode('');
    }
  };

  const handleCopyInvitationCode = () => {
    if (invitationCode) {
      navigator.clipboard.writeText(invitationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
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

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await HouseholdService.removeMember(memberId);
      await loadHouseholdData();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleTransferOwnership = async (memberId: string, memberName: string) => {
    const confirmed = confirm(
      `Transfer ownership to ${memberName}?\n\n` +
      `You will become a Household Member and ${memberName} will become the Owner. ` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await HouseholdService.transferOwnership(memberId);
      await loadHouseholdData();
      alert(`Ownership successfully transferred to ${memberName}`);
    } catch (error: any) {
      console.error('Error transferring ownership:', error);
      alert(error.message || 'Failed to transfer ownership');
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
      owner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      member: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[role as keyof typeof colors] || colors.member;
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Household Member'; // Simplified from "Admin"
      default:
        return 'Household Member';
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const canManageMembers = userRole === 'owner' || userRole === 'admin';

  const content = (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Home className="h-6 w-6 text-white" />
              <h2 className="text-xl font-semibold text-white">Household Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
            ) : (
              <>
                {/* Household Name */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <Home className="h-5 w-5 mr-2" />
                    Household Name
                  </h3>
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
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{household?.name}</span>
                      {userRole === 'owner' && (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Members List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Household Members ({members.length})
                    </h3>
                  </div>

                  <div className="space-y-2 mb-4">
                    {members.map((member) => {
                      const isCurrentUser = member.user_id === user?.id;
                      const canManageThisMember = canManageMembers && !isCurrentUser && member.role !== 'owner';
                      const canTransferToThisMember = userRole === 'owner' && !isCurrentUser && member.role !== 'owner';

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
                                  {getRoleLabel(member.role)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Joined {new Date(member.joined_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          {(canManageThisMember || canTransferToThisMember) && (
                            <div className="flex items-center gap-2">
                              {canTransferToThisMember && (
                                <button
                                  onClick={() => handleTransferOwnership(member.id, member.email || 'this user')}
                                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors font-medium border border-yellow-300 dark:border-yellow-700"
                                  title="Transfer ownership to this member"
                                >
                                  <Crown className="h-3 w-3" />
                                  Make Owner
                                </button>
                              )}
                              {canManageThisMember && (
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Invite Section */}
                {canManageMembers && invitationCode && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-4">
                      <UserPlus className="h-5 w-5 mr-2" />
                      Invite Members
                    </h3>
                    
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                        Share this code to invite others to your household:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={invitationCode}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-700 rounded-md text-gray-900 dark:text-gray-100 font-mono text-sm select-all"
                        />
                        <button
                          onClick={handleCopyInvitationCode}
                          className={`px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors ${
                            copiedCode
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {copiedCode ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                        Anyone with this code can join your household as a member.
                      </p>
                    </div>
                  </div>
                )}

                {/* Join/Leave Actions */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                  >
                    <UserCheck className="h-5 w-5" />
                    Join Another Household
                  </button>
                  
                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                  >
                    <LogOut className="h-5 w-5" />
                    Leave & Create New Household
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <JoinHouseholdModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
      <LeaveHouseholdModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
      />
    </>
  );

  return createPortal(content, document.body);
};

export default HouseholdSettingsModal;
