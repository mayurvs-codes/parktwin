import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crossTabSyncService } from '@/services/sync/crossTabSyncService';
import { useUserPortalStore } from '@/store/useUserPortalStore';
import { useDemoMovieStore } from '@/store/useDemoMovieStore';

describe('Cross-Tab Synchronization Unit Tests', () => {
  beforeEach(() => {
    useDemoMovieStore.getState().resetMovie({ broadcast: false });
    useUserPortalStore.getState().resetDemo({ broadcast: false });
  });

  it('1. Broadcasts and receives messages through registered subscribers', () => {
    const received: any[] = [];
    const unsubscribe = crossTabSyncService.subscribe((msg) => {
      received.push(msg);
    });

    // Simulate an incoming message from a remote tab
    const remoteSenderId = 'remote_tab_test_123';
    (crossTabSyncService as any).handleIncoming({
      type: 'SYNC_OCCUPANCY',
      senderId: remoteSenderId,
      payload: {
        spaceId: 'SP-24',
        isOccupied: true,
        vehicleId: 'VEH-001',
        plate: 'KA04MH1234',
        timestamp: Date.now(),
      },
    });

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('SYNC_OCCUPANCY');
    expect(received[0].payload.spaceId).toBe('SP-24');
    expect(received[0].payload.isOccupied).toBe(true);

    unsubscribe();
  });

  it('2. Ignores incoming messages sent by the same tab (anti-loop guard)', () => {
    const received: any[] = [];
    const unsubscribe = crossTabSyncService.subscribe((msg) => {
      received.push(msg);
    });

    const currentSenderId = crossTabSyncService.getSenderId();
    (crossTabSyncService as any).handleIncoming({
      type: 'SYNC_OCCUPANCY',
      senderId: currentSenderId, // Own ID!
      payload: {
        spaceId: 'SP-24',
        isOccupied: true,
        timestamp: Date.now(),
      },
    });

    expect(received.length).toBe(0);
    unsubscribe();
  });

  it('3. Updates useDemoMovieStore spaces and creates activity event when remote SYNC_OCCUPANCY is received', () => {
    // Initially SP-24 should be unoccupied
    const initialSpace = useDemoMovieStore.getState().spaces.find((s) => s.id === 'SP-24');
    expect(initialSpace?.isOccupied).toBe(false);

    // Incoming remote sync that VEH-001 parked in SP-24
    (crossTabSyncService as any).handleIncoming({
      type: 'SYNC_OCCUPANCY',
      senderId: 'remote_user_portal_tab',
      payload: {
        spaceId: 'SP-24',
        isOccupied: true,
        vehicleId: 'VEH-001',
        plate: 'KA04MH1234',
        timestamp: Date.now(),
      },
    });

    const updatedSpace = useDemoMovieStore.getState().spaces.find((s) => s.id === 'SP-24');
    expect(updatedSpace?.isOccupied).toBe(true);
    expect(updatedSpace?.currentVehicleId).toBe('VEH-001');
    expect(updatedSpace?.currentPlate).toBe('KA04MH1234');

    // Admin intelligence feed should record the event
    const events = useDemoMovieStore.getState().events;
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.slotId).toBe('SP-24');
    expect(events[0]?.eventType).toBe('VEHICLE_PARKED');
  });

  it('4. Updates useDemoMovieStore spaces when remote vehicle exits (SYNC_OCCUPANCY false)', () => {
    // First simulate space occupied
    useDemoMovieStore.setState({
      spaces: useDemoMovieStore.getState().spaces.map((s) =>
        s.id === 'SP-24' ? { ...s, isOccupied: true, currentVehicleId: 'VEH-001' } : s
      ),
    });

    // Remote vehicle exits
    (crossTabSyncService as any).handleIncoming({
      type: 'SYNC_OCCUPANCY',
      senderId: 'remote_user_portal_tab',
      payload: {
        spaceId: 'SP-24',
        isOccupied: false,
        vehicleId: null,
        plate: null,
        timestamp: Date.now(),
      },
    });

    const space = useDemoMovieStore.getState().spaces.find((s) => s.id === 'SP-24');
    expect(space?.isOccupied).toBe(false);
    expect(space?.currentVehicleId).toBeNull();
  });

  it('5. Resets useUserPortalStore when ADMIN broadcasts SYNC_RESET', () => {
    // Advance user portal state first
    useUserPortalStore.getState().startNavigation();
    expect(useUserPortalStore.getState().journeyStep).toBe('NAVIGATING_TO_SPACE');

    // Remote admin resets the movie
    (crossTabSyncService as any).handleIncoming({
      type: 'SYNC_RESET',
      senderId: 'remote_admin_tab',
      payload: {
        source: 'ADMIN',
        mode: 'DEMO',
        timestamp: Date.now(),
      },
    });

    // User portal should be reset back to initial state
    expect(useUserPortalStore.getState().journeyStep).toBe('SPACE_ASSIGNED');
    expect(useUserPortalStore.getState().sessionDurationSeconds).toBe(0);
  });

  it('6. arriveAtSpace() broadcasts occupancy and updates shared facility store', () => {
    const broadcastSpy = vi.spyOn(crossTabSyncService, 'broadcastOccupancy');
    const journeySpy = vi.spyOn(crossTabSyncService, 'broadcastJourney');

    // Transition to NAVIGATING_TO_SPACE first
    useUserPortalStore.getState().startNavigation();
    expect(useUserPortalStore.getState().journeyStep).toBe('NAVIGATING_TO_SPACE');

    // Trigger arrival
    useUserPortalStore.getState().arriveAtSpace();

    expect(useUserPortalStore.getState().journeyStep).toBe('PARKED');
    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'SP-07',
        isOccupied: true,
        vehicleId: 'VEH-001',
      })
    );
    expect(journeySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'VEH-001',
        journeyStep: 'PARKED',
      })
    );

    broadcastSpy.mockRestore();
    journeySpy.mockRestore();
  });

  it('7. confirmExit() broadcasts free occupancy and session completion', () => {
    const broadcastSpy = vi.spyOn(crossTabSyncService, 'broadcastOccupancy');
    const journeySpy = vi.spyOn(crossTabSyncService, 'broadcastJourney');

    // Set user to AT_GATEWAY
    useUserPortalStore.setState({ journeyStep: 'AT_GATEWAY', assignedSpaceId: 'SP-24' });

    useUserPortalStore.getState().confirmExit();

    expect(useUserPortalStore.getState().journeyStep).toBe('SESSION_COMPLETE');
    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'SP-24',
        isOccupied: false,
      })
    );
    expect(journeySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'VEH-001',
        journeyStep: 'SESSION_COMPLETE',
      })
    );

    broadcastSpy.mockRestore();
    journeySpy.mockRestore();
  });
});
