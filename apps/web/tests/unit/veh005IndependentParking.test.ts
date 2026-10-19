import { describe, it, expect, beforeEach } from 'vitest';
import { crossTabSyncService } from '@/services/sync/crossTabSyncService';
import { useUserPortalStore, checkSlotConflict } from '@/store/useUserPortalStore';
import { useDemoMovieStore } from '@/store/useDemoMovieStore';
import { DEMO_VEHICLES } from '@/config/demoVehicles';

describe('VEH-005 Independent Parking & Multi-User Isolation Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    crossTabSyncService.reset();
    useDemoMovieStore.getState().resetMovie({ broadcast: false });
    useUserPortalStore.getState().resetDemo({ broadcast: false });
  });

  it('Test 1: VEH-005 alone parks in SP-31 and occupies ONLY SP-31', () => {
    // Select VEH-005
    useUserPortalStore.getState().selectVehicle('VEH-005');
    expect(useUserPortalStore.getState().activeVehicleId).toBe('VEH-005');
    expect(DEMO_VEHICLES['VEH-005']!.scenario.defaultRecommendedSpaceId).toBe('SP-31');

    // Assign SP-31 and park
    const assignOk = useUserPortalStore.getState().assignSpace('SP-31');
    expect(assignOk).toBe(true);
    expect(useUserPortalStore.getState().assignedSpaceId).toBe('SP-31');

    useUserPortalStore.getState().startNavigation();
    expect(useUserPortalStore.getState().journeyStep).toBe('NAVIGATING_TO_SPACE');

    const arriveOk = useUserPortalStore.getState().arriveAtSpace();
    expect(arriveOk).toBe(true);
    expect(useUserPortalStore.getState().journeyStep).toBe('PARKED');

    // Admin Digital Twin verification: SP-31 is occupied by VEH-005
    const adminSpaces = useDemoMovieStore.getState().spaces;
    const sp31 = adminSpaces.find((s) => s.id === 'SP-31');
    expect(sp31?.isOccupied).toBe(true);
    expect(sp31?.currentVehicleId).toBe('VEH-005');

    // Other demo vehicle bays (SP-08, SP-14, SP-17, SP-07) MUST remain available
    const sp08 = adminSpaces.find((s) => s.id === 'SP-08');
    const sp14 = adminSpaces.find((s) => s.id === 'SP-14');
    const sp17 = adminSpaces.find((s) => s.id === 'SP-17');
    const sp07 = adminSpaces.find((s) => s.id === 'SP-07');

    expect(sp08?.isOccupied).toBe(false);
    expect(sp14?.isOccupied).toBe(false);
    expect(sp17?.isOccupied).toBe(false);
    expect(sp07?.isOccupied).toBe(false);
  });

  it('Test 2: VEH-005 does not block VEH-003 from parking in SP-08', () => {
    // 1. Park VEH-005 in SP-31
    useUserPortalStore.getState().selectVehicle('VEH-005');
    useUserPortalStore.getState().assignSpace('SP-31');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();
    expect(useUserPortalStore.getState().journeys['VEH-005']?.journeyStep).toBe('PARKED');

    // 2. Select VEH-003 and verify slot conflict check for SP-08 returns false
    useUserPortalStore.getState().selectVehicle('VEH-003');
    const conflictResult = checkSlotConflict(
      'SP-08',
      'VEH-003',
      useUserPortalStore.getState().journeys,
      useDemoMovieStore.getState().spaces
    );
    expect(conflictResult.hasConflict).toBe(false);

    // 3. Assign SP-08 to VEH-003 and park
    const assignOk = useUserPortalStore.getState().assignSpace('SP-08');
    expect(assignOk).toBe(true);
    useUserPortalStore.getState().startNavigation();
    const arriveOk = useUserPortalStore.getState().arriveAtSpace();
    expect(arriveOk).toBe(true);

    // Both VEH-005 and VEH-003 must be safely parked in their respective bays
    const state = useUserPortalStore.getState();
    expect(state.journeys['VEH-005']?.journeyStep).toBe('PARKED');
    expect(state.journeys['VEH-005']?.assignedSpaceId).toBe('SP-31');
    expect(state.journeys['VEH-003']?.journeyStep).toBe('PARKED');
    expect(state.journeys['VEH-003']?.assignedSpaceId).toBe('SP-08');

    // Verify Admin Digital Twin reflects both
    const adminSpaces = useDemoMovieStore.getState().spaces;
    expect(adminSpaces.find((s) => s.id === 'SP-31')?.isOccupied).toBe(true);
    expect(adminSpaces.find((s) => s.id === 'SP-31')?.currentVehicleId).toBe('VEH-005');
    expect(adminSpaces.find((s) => s.id === 'SP-08')?.isOccupied).toBe(true);
    expect(adminSpaces.find((s) => s.id === 'SP-08')?.currentVehicleId).toBe('VEH-003');
  });

  it('Test 3: VEH-005 does not mutate other vehicle journeys', () => {
    const initialJourneys = useUserPortalStore.getState().journeys;
    const initialV1 = { ...initialJourneys['VEH-001'] };
    const initialV2 = { ...initialJourneys['VEH-002'] };
    const initialV3 = { ...initialJourneys['VEH-003'] };
    const initialV4 = { ...initialJourneys['VEH-004'] };

    // Select and park VEH-005
    useUserPortalStore.getState().selectVehicle('VEH-005');
    useUserPortalStore.getState().assignSpace('SP-31');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    const currentJourneys = useUserPortalStore.getState().journeys;

    // Check VEH-001 through VEH-004 remain unchanged
    expect(currentJourneys['VEH-001']?.assignedSpaceId).toBe(initialV1.assignedSpaceId);
    expect(currentJourneys['VEH-001']?.journeyStep).toBe(initialV1.journeyStep);

    expect(currentJourneys['VEH-002']?.assignedSpaceId).toBe(initialV2.assignedSpaceId);
    expect(currentJourneys['VEH-002']?.journeyStep).toBe(initialV2.journeyStep);

    expect(currentJourneys['VEH-003']?.assignedSpaceId).toBe(initialV3.assignedSpaceId);
    expect(currentJourneys['VEH-003']?.journeyStep).toBe(initialV3.journeyStep);

    expect(currentJourneys['VEH-004']?.assignedSpaceId).toBe(initialV4.assignedSpaceId);
    expect(currentJourneys['VEH-004']?.journeyStep).toBe(initialV4.journeyStep);
  });

  it('Test 4: Simultaneous multi-vehicle occupancy (all 5 demo vehicles parked)', () => {
    // 1. Park VEH-001 in SP-07
    useUserPortalStore.getState().selectVehicle('VEH-001');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    // 2. Park VEH-002 in SP-14
    useUserPortalStore.getState().selectVehicle('VEH-002');
    useUserPortalStore.getState().assignSpace('SP-14');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    // 3. Park VEH-003 in SP-08
    useUserPortalStore.getState().selectVehicle('VEH-003');
    useUserPortalStore.getState().assignSpace('SP-08');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    // 4. Park VEH-004 in SP-17
    useUserPortalStore.getState().selectVehicle('VEH-004');
    useUserPortalStore.getState().assignSpace('SP-17');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    // 5. Park VEH-005 in SP-31
    useUserPortalStore.getState().selectVehicle('VEH-005');
    useUserPortalStore.getState().assignSpace('SP-31');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    const userState = useUserPortalStore.getState();
    expect(userState.journeys['VEH-001']?.journeyStep).toBe('PARKED');
    expect(userState.journeys['VEH-001']?.assignedSpaceId).toBe('SP-07');

    expect(userState.journeys['VEH-002']?.journeyStep).toBe('PARKED');
    expect(userState.journeys['VEH-002']?.assignedSpaceId).toBe('SP-14');

    expect(userState.journeys['VEH-003']?.journeyStep).toBe('PARKED');
    expect(userState.journeys['VEH-003']?.assignedSpaceId).toBe('SP-08');

    expect(userState.journeys['VEH-004']?.journeyStep).toBe('PARKED');
    expect(userState.journeys['VEH-004']?.assignedSpaceId).toBe('SP-17');

    expect(userState.journeys['VEH-005']?.journeyStep).toBe('PARKED');
    expect(userState.journeys['VEH-005']?.assignedSpaceId).toBe('SP-31');

    // Verify Admin Twin has all 5 spaces occupied with correct vehicles
    const adminSpaces = useDemoMovieStore.getState().spaces;
    expect(adminSpaces.find((s) => s.id === 'SP-07')?.currentVehicleId).toBe('VEH-001');
    expect(adminSpaces.find((s) => s.id === 'SP-14')?.currentVehicleId).toBe('VEH-002');
    expect(adminSpaces.find((s) => s.id === 'SP-08')?.currentVehicleId).toBe('VEH-003');
    expect(adminSpaces.find((s) => s.id === 'SP-17')?.currentVehicleId).toBe('VEH-004');
    expect(adminSpaces.find((s) => s.id === 'SP-31')?.currentVehicleId).toBe('VEH-005');

    // All 5 must be present and marked PARKED in Admin vehicles list
    const adminVehicles = useDemoMovieStore.getState().vehicles;
    const demoIds = ['VEH-001', 'VEH-002', 'VEH-003', 'VEH-004', 'VEH-005'] as const;
    for (const id of demoIds) {
      const v = adminVehicles.find((veh) => veh.id === id);
      expect(v).toBeDefined();
      expect(v?.state).toBe('PARKED');
    }
  });

  it('Test 5: Independent exit — VEH-005 exits and frees only SP-31 while 4 vehicles stay parked', () => {
    // Setup all 5 parked
    useUserPortalStore.getState().selectVehicle('VEH-001');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    useUserPortalStore.getState().selectVehicle('VEH-002');
    useUserPortalStore.getState().assignSpace('SP-14');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    useUserPortalStore.getState().selectVehicle('VEH-003');
    useUserPortalStore.getState().assignSpace('SP-08');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    useUserPortalStore.getState().selectVehicle('VEH-004');
    useUserPortalStore.getState().assignSpace('SP-17');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    useUserPortalStore.getState().selectVehicle('VEH-005');
    useUserPortalStore.getState().assignSpace('SP-31');
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    // VEH-005 exits
    useUserPortalStore.getState().selectVehicle('VEH-005');
    useUserPortalStore.getState().viewParkingSession();
    useUserPortalStore.getState().requestExit();
    useUserPortalStore.getState().reachGateway();
    useUserPortalStore.getState().confirmExit();

    expect(useUserPortalStore.getState().journeyStep).toBe('SESSION_COMPLETE');

    // Admin Twin: ONLY SP-31 is freed
    const adminSpaces = useDemoMovieStore.getState().spaces;
    const sp31 = adminSpaces.find((s) => s.id === 'SP-31');
    expect(sp31?.isOccupied).toBe(false);
    expect(sp31?.currentVehicleId).toBeNull();

    // The other 4 vehicles MUST remain safely occupied
    expect(adminSpaces.find((s) => s.id === 'SP-07')?.currentVehicleId).toBe('VEH-001');
    expect(adminSpaces.find((s) => s.id === 'SP-14')?.currentVehicleId).toBe('VEH-002');
    expect(adminSpaces.find((s) => s.id === 'SP-08')?.currentVehicleId).toBe('VEH-003');
    expect(adminSpaces.find((s) => s.id === 'SP-17')?.currentVehicleId).toBe('VEH-004');

    expect(adminSpaces.find((s) => s.id === 'SP-07')?.isOccupied).toBe(true);
    expect(adminSpaces.find((s) => s.id === 'SP-14')?.isOccupied).toBe(true);
    expect(adminSpaces.find((s) => s.id === 'SP-08')?.isOccupied).toBe(true);
    expect(adminSpaces.find((s) => s.id === 'SP-17')?.isOccupied).toBe(true);

    // User store journeys check
    const userJourneys = useUserPortalStore.getState().journeys;
    expect(userJourneys['VEH-001']?.journeyStep).toBe('PARKED');
    expect(userJourneys['VEH-002']?.journeyStep).toBe('PARKED');
    expect(userJourneys['VEH-003']?.journeyStep).toBe('PARKED');
    expect(userJourneys['VEH-004']?.journeyStep).toBe('PARKED');
    expect(userJourneys['VEH-005']?.journeyStep).toBe('SESSION_COMPLETE');
  });

  it('Test 6: Cross-tab synchronization — Remote tab parking VEH-005 updates Admin and local state', () => {
    // Current tab is focused on VEH-001
    useUserPortalStore.getState().selectVehicle('VEH-001');

    // Simulate remote tab broadcasting occupancy & journey for VEH-005 in SP-31
    (crossTabSyncService as any).handleIncoming({
      eventId: 'evt_remote_v5_park_001',
      type: 'SYNC_OCCUPANCY',
      senderId: 'remote_tab_v5',
      slotId: 'SP-31',
      version: 1,
      payload: {
        spaceId: 'SP-31',
        isOccupied: true,
        vehicleId: 'VEH-005',
        plate: null,
        timestamp: Date.now(),
      },
    });

    (crossTabSyncService as any).handleIncoming({
      eventId: 'evt_remote_v5_jny_001',
      type: 'SYNC_VEHICLE_JOURNEY',
      senderId: 'remote_tab_v5',
      vehicleId: 'VEH-005',
      slotId: 'SP-31',
      version: 1,
      payload: {
        vehicleId: 'VEH-005',
        journeyStep: 'PARKED',
        assignedSpaceId: 'SP-31',
        sessionDurationSeconds: 0,
        activeSession: {
          sessionId: 'sess_VEH-005_remote',
          vehicleId: 'VEH-005',
          spaceId: 'SP-31',
          zone: 'Zone C',
          level: 'B2',
          entryTime: '11:13 AM',
          parkedTime: '11:15 AM',
          parkedTimeMs: Date.now(),
          durationSeconds: 0,
          wasReserved: false,
        },
        version: 1,
        timestamp: Date.now(),
      },
    });

    // Verify Admin Twin updated from remote broadcast
    const adminSpaces = useDemoMovieStore.getState().spaces;
    const sp31 = adminSpaces.find((s) => s.id === 'SP-31');
    expect(sp31?.isOccupied).toBe(true);
    expect(sp31?.currentVehicleId).toBe('VEH-005');

    // Verify local User store has updated VEH-005 journey without disturbing VEH-001
    const userState = useUserPortalStore.getState();
    expect(userState.activeVehicleId).toBe('VEH-001'); // Local active vehicle untouched
    expect(userState.journeys['VEH-005']?.journeyStep).toBe('PARKED');
    expect(userState.journeys['VEH-005']?.assignedSpaceId).toBe('SP-31');
  });
});
