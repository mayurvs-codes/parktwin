"""add_missing_columns_camera_role_parking_area_slot_group_vehicle_prototype_id

Revision ID: d7bd485c7244
Revises: 001_initial_schema
Create Date: 2026-09-05 23:11:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd7bd485c7244'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns to cameras table
    op.add_column('cameras', sa.Column('role', sa.String(32), nullable=True))
    op.add_column('cameras', sa.Column('parking_area', sa.String(64), nullable=True))
    op.add_column('cameras', sa.Column('slot_group', sa.String(64), nullable=True))
    op.add_column('cameras', sa.Column('fps_target', sa.Integer(), nullable=True, server_default='25'))
    op.add_column('cameras', sa.Column('is_enabled', sa.Boolean(), nullable=True, server_default='1'))
    op.add_column('cameras', sa.Column('meta', sa.JSON(), nullable=True))
    op.add_column('cameras', sa.Column('created_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('cameras', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_cameras_role', 'cameras', ['role'])

    # Add missing columns to vehicles table
    op.add_column('vehicles', sa.Column('prototype_id', sa.String(32), nullable=True, index=True))
    op.add_column('vehicles', sa.Column('plate_confidence', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('vehicles', sa.Column('color_confidence', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('vehicles', sa.Column('detection_confidence', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('vehicles', sa.Column('is_registered', sa.Boolean(), nullable=True, server_default='0'))
    op.add_column('vehicles', sa.Column('snapshots', sa.JSON(), nullable=True))
    op.add_column('vehicles', sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vehicles', sa.Column('created_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_vehicles_prototype_id', 'vehicles', ['prototype_id'])

    # Add missing columns to parking_slots table
    op.add_column('parking_slots', sa.Column('id', sa.CHAR(32), nullable=False, primary_key=True))
    op.add_column('parking_slots', sa.Column('slot_id', sa.String(32), nullable=False, index=True))
    op.add_column('parking_slots', sa.Column('camera_id', sa.String(64), nullable=False, index=True))
    op.add_column('parking_slots', sa.Column('zone', sa.String(64), nullable=True, server_default='general'))
    op.add_column('parking_slots', sa.Column('state', sa.String(8), nullable=True, server_default='unknown'))
    op.add_column('parking_slots', sa.Column('is_reserved', sa.Boolean(), nullable=True, server_default='0'))
    op.add_column('parking_slots', sa.Column('reserved_for', sa.String(128), nullable=True))
    op.add_column('parking_slots', sa.Column('position', sa.JSON(), nullable=True))
    op.add_column('parking_slots', sa.Column('meta', sa.JSON(), nullable=True))
    op.add_column('parking_slots', sa.Column('created_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('parking_slots', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))

    # Add missing columns to parking_sessions table
    op.add_column('parking_sessions', sa.Column('id', sa.CHAR(32), nullable=False, primary_key=True))
    op.add_column('parking_sessions', sa.Column('session_uid', sa.String(64), nullable=False, unique=True, index=True))
    op.add_column('parking_sessions', sa.Column('camera_id', sa.String(64), nullable=False, index=True))
    op.add_column('parking_sessions', sa.Column('slot_id', sa.String(32), nullable=True, index=True))
    op.add_column('parking_sessions', sa.Column('vehicle_id', sa.CHAR(32), nullable=True))
    op.add_column('parking_sessions', sa.Column('license_plate', sa.String(32), nullable=True, index=True))
    op.add_column('parking_sessions', sa.Column('tracking_id', sa.Integer(), nullable=True, index=True))
    op.add_column('parking_sessions', sa.Column('entry_time', sa.DateTime(timezone=True), nullable=False))
    op.add_column('parking_sessions', sa.Column('exit_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('parking_sessions', sa.Column('duration_seconds', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('parking_sessions', sa.Column('is_active', sa.Boolean(), nullable=True, server_default='1'))
    op.add_column('parking_sessions', sa.Column('violation_flags', sa.JSON(), nullable=True))
    op.add_column('parking_sessions', sa.Column('meta', sa.JSON(), nullable=True))
    op.add_column('parking_sessions', sa.Column('created_at', sa.DateTime(timezone=True), nullable=True))

    # Add missing columns to parking_events table
    op.add_column('parking_events', sa.Column('id', sa.CHAR(32), nullable=False, primary_key=True))
    op.add_column('parking_events', sa.Column('event_uid', sa.String(64), nullable=False, unique=True, index=True))
    op.add_column('parking_events', sa.Column('event_type', sa.String(48), nullable=False, index=True))
    op.add_column('parking_events', sa.Column('camera_id', sa.String(64), nullable=True, index=True))
    op.add_column('parking_events', sa.Column('slot_id', sa.String(32), nullable=True, index=True))
    op.add_column('parking_events', sa.Column('vehicle_id', sa.CHAR(32), nullable=True))
    op.add_column('parking_events', sa.Column('tracking_id', sa.Integer(), nullable=True, index=True))
    op.add_column('parking_events', sa.Column('license_plate', sa.String(32), nullable=True, index=True))
    op.add_column('parking_events', sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')))
    op.add_column('parking_events', sa.Column('meta', sa.JSON(), nullable=True))

    # Add missing columns to detection_logs table
    op.add_column('detection_logs', sa.Column('id', sa.CHAR(32), nullable=False, primary_key=True))
    op.add_column('detection_logs', sa.Column('camera_id', sa.CHAR(32), nullable=True))
    op.add_column('detection_logs', sa.Column('vehicle_id', sa.CHAR(32), nullable=True))
    op.add_column('detection_logs', sa.Column('tracking_id', sa.Integer(), nullable=True))
    op.add_column('detection_logs', sa.Column('frame_number', sa.Integer(), nullable=True))
    op.add_column('detection_logs', sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')))
    op.add_column('detection_logs', sa.Column('detection_type', sa.String(32), nullable=True))
    op.add_column('detection_logs', sa.Column('detected_class', sa.String(64), nullable=True))
    op.add_column('detection_logs', sa.Column('confidence', sa.Float(), nullable=True))
    op.add_column('detection_logs', sa.Column('bounding_box', sa.JSON(), nullable=True))
    op.add_column('detection_logs', sa.Column('license_plate_raw', sa.String(32), nullable=True))
    op.add_column('detection_logs', sa.Column('license_plate_confidence', sa.Float(), nullable=True))
    op.add_column('detection_logs', sa.Column('ocr_engine', sa.String(32), nullable=True))
    op.add_column('detection_logs', sa.Column('inference_time_ms', sa.Float(), nullable=True))
    op.add_column('detection_logs', sa.Column('meta', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove added columns from cameras
    op.drop_index('ix_cameras_role', 'cameras')
    op.drop_column('cameras', 'role')
    op.drop_column('cameras', 'parking_area')
    op.drop_column('cameras', 'slot_group')
    op.drop_column('cameras', 'fps_target')
    op.drop_column('cameras', 'is_enabled')
    op.drop_column('cameras', 'meta')
    op.drop_column('cameras', 'created_at')
    op.drop_column('cameras', 'updated_at')

    # Remove added columns from vehicles
    op.drop_index('ix_vehicles_prototype_id', 'vehicles')
    op.drop_column('vehicles', 'prototype_id')
    op.drop_column('vehicles', 'plate_confidence')
    op.drop_column('vehicles', 'color_confidence')
    op.drop_column('vehicles', 'detection_confidence')
    op.drop_column('vehicles', 'is_registered')
    op.drop_column('vehicles', 'snapshots')
    op.drop_column('vehicles', 'last_seen')
    op.drop_column('vehicles', 'created_at')

    # Remove added columns from parking_slots
    op.drop_column('parking_slots', 'id')
    op.drop_column('parking_slots', 'slot_id')
    op.drop_column('parking_slots', 'camera_id')
    op.drop_column('parking_slots', 'zone')
    op.drop_column('parking_slots', 'state')
    op.drop_column('parking_slots', 'is_reserved')
    op.drop_column('parking_slots', 'reserved_for')
    op.drop_column('parking_slots', 'position')
    op.drop_column('parking_slots', 'meta')
    op.drop_column('parking_slots', 'created_at')
    op.drop_column('parking_slots', 'updated_at')

    # Remove added columns from parking_sessions
    op.drop_column('parking_sessions', 'id')
    op.drop_column('parking_sessions', 'session_uid')
    op.drop_column('parking_sessions', 'camera_id')
    op.drop_column('parking_sessions', 'slot_id')
    op.drop_column('parking_sessions', 'vehicle_id')
    op.drop_column('parking_sessions', 'license_plate')
    op.drop_column('parking_sessions', 'tracking_id')
    op.drop_column('parking_sessions', 'entry_time')
    op.drop_column('parking_sessions', 'exit_time')
    op.drop_column('parking_sessions', 'duration_seconds')
    op.drop_column('parking_sessions', 'is_active')
    op.drop_column('parking_sessions', 'violation_flags')
    op.drop_column('parking_sessions', 'meta')
    op.drop_column('parking_sessions', 'created_at')

    # Remove added columns from parking_events
    op.drop_column('parking_events', 'id')
    op.drop_column('parking_events', 'event_uid')
    op.drop_column('parking_events', 'event_type')
    op.drop_column('parking_events', 'camera_id')
    op.drop_column('parking_events', 'slot_id')
    op.drop_column('parking_events', 'vehicle_id')
    op.drop_column('parking_events', 'tracking_id')
    op.drop_column('parking_events', 'license_plate')
    op.drop_column('parking_events', 'timestamp')
    op.drop_column('parking_events', 'meta')

    # Remove added columns from detection_logs
    op.drop_column('detection_logs', 'id')
    op.drop_column('detection_logs', 'camera_id')
    op.drop_column('detection_logs', 'vehicle_id')
    op.drop_column('detection_logs', 'tracking_id')
    op.drop_column('detection_logs', 'frame_number')
    op.drop_column('detection_logs', 'timestamp')
    op.drop_column('detection_logs', 'detection_type')
    op.drop_column('detection_logs', 'detected_class')
    op.drop_column('detection_logs', 'confidence')
    op.drop_column('detection_logs', 'bounding_box')
    op.drop_column('detection_logs', 'license_plate_raw')
    op.drop_column('detection_logs', 'license_plate_confidence')
    op.drop_column('detection_logs', 'ocr_engine')
    op.drop_column('detection_logs', 'inference_time_ms')
    op.drop_column('detection_logs', 'meta')