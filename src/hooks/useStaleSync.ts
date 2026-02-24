"use client";

import { useEffect } from 'react';
import { useGraphStore } from '@/store/useGraphStore';
import { differenceInMinutes } from 'date-fns';

const STALE_THRESHOLD_MINUTES = 5;

/**
 * Hook to automatically check for stale sync statuses in the background.
 * If a node hasn't been synced for > threshold, it transitions to NEEDS_UPDATE.
 */
export const useStaleSync = () => {
  const { nodes, updateNodeStatus } = useGraphStore();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      nodes.forEach((node) => {
        // Only task owners/contributors can go stale, and only if they are currently IN_SYNC
        if (node.data.isTaskNode || node.data.status !== 'IN_SYNC') return;

        if (node.data.lastSyncedAt) {
          const lastSync = new Date(node.data.lastSyncedAt);
          const diff = differenceInMinutes(now, lastSync);

          if (diff >= STALE_THRESHOLD_MINUTES) {
            console.log(`Auto-flagging node ${node.id} as stale (${diff} mins since last sync)`);
            updateNodeStatus(node.id, 'NEEDS_UPDATE');
          }
        } else {
          // If never synced, consider it stale immediately? 
          // For now, we only track those with a timestamp to avoid initial noise
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [nodes, updateNodeStatus]);
};
