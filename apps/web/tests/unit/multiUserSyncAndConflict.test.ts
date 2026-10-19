import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crossTabSyncService } from '@/services/sync/crossTabSyncService';
import { useUserPortalStore, checkSlotConflict, STORAGE_KEY_USER_PORTAL } from '@/store/useUserPortalStore';
import { useDemoMovieStore } from '@/store/useDemoMovieStore';
import { CANONICAL_60_SPACES } from '@/components/digital-twin/demoScenarioData';

describe('Multi-User Sync, Slot Conflict, and Admin Hydration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    crossTabSyncService.reset();
    useDemoMovieStore.getState().resetMovie({ broadcast: false });
    useUserPortalStore.getState().resetDemo({ broadcast: false });
  });

  it('1. True Multi-User Support: Simultaneous independent vehicles (VEH-001 in SP-07 and VEH-002 in SP-14)', () => {
    // Park VEH-001 at SP-07
    useUserPortalStore.getState().selectVehicle('VEH-001');
    useUserPortalStore.getState().startNavigation();
    const success1 = useUserPortalStore.getState().arriveAtSpace();
    expect(success1).toBe(true);

    // Park VEH-002 at SP-14 (User B reserves & assigns SP-14)
    useUserPortalStore.getState().selectVehicle('VEH-002');
    useUserPortalStore.getState().assignSpace('SP-14');
    useUserPortalStore.getState().startNavigation();
    const success2 = useUserPortalStore.getState().arriveAtSpace();
    expect(success2).toBe(true);

    const userState = useUserPortalStore.getState();

    // Verify both journeys are independently PARKED
    expect(userState.journeys['VEH-001']?.journeyStep).toBe('PARKED');
    expect(userState.journeys['VEH-001']?.assignedSpaceId).toBe('SP-07');
    expect(userState.journeys['VEH-002']?.journeyStep).toBe('PARKED');
    expect(userState.journeys['VEH-002']?.assignedSpaceId).toBe('SP-14');

    // Verify Admin Digital Twin spaces reflect both vehicles
    const adminSpaces = useDemoMovieStore.getState().spaces;
    const sp07 = adminSpaces.find((s) => s.id === 'SP-07');
    const sp14 = adminSpaces.find((s) => s.id === 'SP-14');

    expect(sp07?.isOccupied).toBe(true);
    expect(sp07?.currentVehicleId).toBe('VEH-001');
    expect(sp14?.isOccupied).toBe(true);
    expect(sp14?.currentVehicleId).toBe('VEH-002');

    // Verify Admin Digital Twin vehicles array has both vehicle markers rendered
    const adminVehicles = useDemoMovieStore.getState().vehicles;
    const v1 = adminVehicles.find((v) => v.id === 'VEH-001');
    const v2 = adminVehicles.find((v) => v.id === 'VEH-002');

    expect(v1).toBeDefined();
    expect(v1?.state).toBe('PARKED');
    expect(v2).toBeDefined();
    expect(v2?.state).toBe('PARKED');
  });

  it('2. Slot Conflict Rejection: Deterministic protection prevents VEH-003 from claiming SP-07 while occupied by VEH-001', () => {
    // 1. VEH-001 parks in SP-07
    useUserPortalStore.getState().selectVehicle('VEH-001');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    // 2. Direct unit test of checkSlotConflict guard
    const conflictResult = checkSlotConflict(
      'SP-07',
      'VEH-003',
      useUserPortalStore.getState().journeys,
      useDemoMovieStore.getState().spaces
    );
    expect(conflictResult.hasConflict).toBe(true);
    expect(conflictResult.conflictingVehicleId).toBe('VEH-001');

    // 3. VEH-003 tries to assign SP-07
    useUserPortalStore.getState().selectVehicle('VEH-003');
    const assignSuccess = useUserPortalStore.getState().assignSpace('SP-07');
    expect(assignSuccess).toBe(false);

    // Verify conflict error was recorded on store
    expect(useUserPortalStore.getState().conflictError).toContain('SLOT_UNAVAILABLE_CONFLICT');
    expect(useUserPortalStore.getState().conflictError).toContain('VEH-001');
    expect(useUserPortalStore.getState().assignedSpaceId).toBeNull();
  });

  it('3. Independent Vehicle Exit: VEH-001 exits while VEH-002 remains safely parked in SP-14', () => {
    // Setup both vehicles parked
    useUserPortalStore.getState().selectVehicle('VEH-001');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    useUserPortalStore.getState().selectVehicle('VEH-002');
    useUserPortalStore.getState().assignSpace('SP-14');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    // VEH-001 proceeds to exit
    useUserPortalStore.getState().selectVehicle('VEH-001');
    useUserPortalStore.getState().viewParkingSession();
    useUserPortalStore.getState().requestExit();
    useUserPortalStore.getState().reachGateway();
    useUserPortalStore.getState().confirmExit();

    expect(useUserPortalStore.getState().journeyStep).toBe('SESSION_COMPLETE');

    // Verify Admin state: SP-07 is available, but SP-14 is still occupied by VEH-002
    const adminSpaces = useDemoMovieStore.getState().spaces;
    const sp07 = adminSpaces.find((s) => s.id === 'SP-07');
    const sp14 = adminSpaces.find((s) => s.id === 'SP-14');

    expect(sp07?.isOccupied).toBe(false);
    expect(sp07?.currentVehicleId).toBeNull();

    expect(sp14?.isOccupied).toBe(true);
    expect(sp14?.currentVehicleId).toBe('VEH-002');

    // Check VEH-002 in user store is still safely PARKED
    const v2Journey = useUserPortalStore.getState().journeys['VEH-002'];
    expect(v2Journey?.journeyStep).toBe('PARKED');
    expect(v2Journey?.assignedSpaceId).toBe('SP-14');
  });

  it('4. Admin Twin Hydration from Storage: Hydrates parked spaces and vehicle markers on mount/refresh', () => {
    // Populate localStorage directly with a multi-vehicle state
    const mockStorage = {
      activeVehicleId: 'VEH-001',
      journeys: {
        'VEH-001': {
          vehicleId: 'VEH-001',
          journeyStep: 'PARKED',
          assignedSpaceId: 'SP-07',
          parkedTimeMs: Date.now() - 60000,
          sessionDurationSeconds: 60,
          activeSession: {
            sessionId: 'sess_VEH-001_mock',
            vehicleId: 'VEH-001',
            spaceId: 'SP-07',
            zone: 'B',
            level: 'B2',
            entryTime: '10:00 AM',
            parkedTime: '10:05 AM',
            parkedTimeMs: Date.now() - 60000,
            durationSeconds: 60,
            wasReserved: true,
          },
          version: 2,
        },
        'VEH-002': {
          vehicleId: 'VEH-002',
          journeyStep: 'PARKED',
          assignedSpaceId: 'SP-14',
          parkedTimeMs: Date.now() - 30000,
          sessionDurationSeconds: 30,
          activeSession: {
            sessionId: 'sess_VEH-002_mock',
            vehicleId: 'VEH-002',
            spaceId: 'SP-14',
            zone: 'B',
            level: 'B2',
            entryTime: '10:10 AM',
            parkedTime: '10:12 AM',
            parkedTimeMs: Date.now() - 30000,
            durationSeconds: 30,
            wasReserved: false,
          },
          version: 2,
        },
      },
      completedSessions: [],
      executionMode: 'DEMO',
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY_USER_PORTAL, JSON.stringify(mockStorage));

    // Hydrate Admin Store
    useDemoMovieStore.getState().hydrateFromStorage();

    const spaces = useDemoMovieStore.getState().spaces;
    const sp07 = spaces.find((s) => s.id === 'SP-07');
    const sp14 = spaces.find((s) => s.id === 'SP-14');

    expect(sp07?.isOccupied).toBe(true);
    expect(sp07?.currentVehicleId).toBe('VEH-001');

    expect(sp14?.isOccupied).toBe(true);
    expect(sp14?.currentVehicleId).toBe('VEH-002');

    // Check vehicles list
    const vehicles = useDemoMovieStore.getState().vehicles;
    expect(vehicles.some((v) => v.id === 'VEH-001' && v.state === 'PARKED')).toBe(true);
    expect(vehicles.some((v) => v.id === 'VEH-002' && v.state === 'PARKED')).toBe(true);
  });

  it('5. Event Deduplication and Anti-Stale Guard: Discards duplicates and stale version messages', () => {
    let callCount = 0;
    const unsubscribe = crossTabSyncService.subscribe(() => {
      callCount++;
    });

    const eventId = 'evt_unique_dedup_test_999';

    // First broadcast: should process
    (crossTabSyncService as any).handleIncoming({
      eventId,
      type: 'SYNC_OCCUPANCY',
      senderId: 'remote_tab_abc',
      slotId: 'SP-07',
      version: 1,
      payload: {
        spaceId: 'SP-07',
        isOccupied: true,
        vehicleId: 'VEH-001',
        timestamp: Date.now(),
      },
    });

    expect(callCount).toBe(1);

    // Duplicate broadcast with same eventId: must be silently ignored
    (crossTabSyncService as any).handleIncoming({
      eventId,
      type: 'SYNC_OCCUPANCY',
      senderId: 'remote_tab_abc',
      slotId: 'SP-07',
      version: 1,
      payload: {
        spaceId: 'SP-07',
        isOccupied: true,
        vehicleId: 'VEH-001',
        timestamp: Date.now(),
      },
    });

    expect(callCount).toBe(1); // Still 1, deduplicated!

    // Stale version broadcast (version 0 when version 1 was seen)
    (crossTabSyncService as any).handleIncoming({
      eventId,
      type: 'SYNC_OCCUPANCY',
      senderId: 'remote_tab_abc',
      slotId: 'SP-07',
      version: 0, // Stale!
      payload: {
        spaceId: 'SP-07',
        isOccupied: false,
        timestamp: Date.now(),
      },
    });

    expect(callCount).toBe(1); // Still 1, discarded as stale!

    unsubscribe();
  });

  it('6. Global Reset Convergence: Reset clears localStorage, resets journeys and spaces', () => {
    // Park VEH-001
    useUserPortalStore.getState().selectVehicle('VEH-001');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    // Trigger Admin Reset
    useDemoMovieStore.getState().resetMovie({ broadcast: false });
    useUserPortalStore.getState().resetDemo({ broadcast: false });

    // Assert SP-07 is released and baseline spaces return to 20
    const spaces = useDemoMovieStore.getState().spaces;
    const sp07 = spaces.find((s) => s.id === 'SP-07');
    expect(sp07?.isOccupied).toBe(false);
    expect(sp07?.currentVehicleId).toBeNull();
    const occupied = spaces.filter((s) => s.isOccupied);
    expect(occupied).toHaveLength(20);

    // Assert user journeys are reset
    const userJourneys = useUserPortalStore.getState().journeys;
    expect(userJourneys['VEH-001']?.journeyStep).toBe('SPACE_ASSIGNED');
    expect(userJourneys['VEH-001']?.assignedSpaceId).toBe('SP-07');
    expect(userJourneys['VEH-001']?.activeSession).toBeNull();
  });
});
