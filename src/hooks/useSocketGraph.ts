"use client";

import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useGraphStore } from '@/store/useGraphStore';
import { SyncStatus } from '@/store/useTaskStore';

interface SyncPayload {
  taskId: string;
  userId: string;
  status: SyncStatus;
  oldStatus: SyncStatus;
  logId: string;
  timestamp: string;
}

interface JoinPayload {
  taskId: string;
  userId: string;
  name: string;        // E.g., from joined user info
  role: string;        // E.g., 'CONTRIBUTOR'
  timestamp: string;
}

export const useSocketGraph = (taskId: string) => {
  const { socket, isConnected } = useSocket(taskId);
  const { updateNodeStatus, addParticipantNode } = useGraphStore();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for Sync Status broadcasts specifically targeting our Task room
    const handleSyncUpdate = (payload: SyncPayload) => {
      console.log('Real-time sync update received:', payload);
      
      // Zustand instantly swaps the status, triggering the CustomNode Tailwind color classes
      // and pulsing animations (if BLOCKED) without unmounting the layout.
      updateNodeStatus(payload.userId, payload.status);
    };

    // Listen for new participants dynamically joining the task execution flow
    const handleParticipantJoined = (payload: JoinPayload) => {
      console.log('New participant dynamically joined:', payload);
      
      // Structure the new node matching the React Flow definition
      const newNode = {
        id: payload.userId,
        type: 'customTaskNode',
        position: { x: 0, y: 0 }, // Handled automatically by layout.ts Dagre algorithm
        data: {
          id: payload.userId,
          name: payload.name,     
          role: payload.role,
          status: 'IN_SYNC' as SyncStatus,
        },
        draggable: false, 
      };

      // By default, assuming new standard participants slot under the Responsible Owner
      // For a definitive system, the Backend socket payload would dictate the ParentId exactly.
      const assumedParentId = 'owner'; 
      addParticipantNode(newNode, assumedParentId);
    };

    // Listen for Help Requests (Turning the node Blue)
    const handleHelpRequest = (payload: { requestorId: string }) => {
      console.log('Real-time Help Request Received for:', payload.requestorId);
      updateNodeStatus(payload.requestorId, 'HELP_REQUESTED');
    };

    // Bind event listeners
    socket.on('sync_updated', handleSyncUpdate);
    socket.on('participant_joined', handleParticipantJoined);
    socket.on('help_requested', handleHelpRequest);

    return () => {
      socket.off('sync_updated', handleSyncUpdate);
      socket.off('participant_joined', handleParticipantJoined);
      socket.off('help_requested', handleHelpRequest);
    };
  }, [socket, isConnected, taskId, updateNodeStatus, addParticipantNode]);

  return { isConnected };
};
