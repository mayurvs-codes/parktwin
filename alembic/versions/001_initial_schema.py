"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cameras',
        sa.Column('camera_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('url', sa.String(length=512), nullable=False),
        sa.Column('location', sa.String(length=256), nullable=True),
        sa.Column('zone', sa.String(length=64), nullable=False),
        sa.Column('status', sa.Enum('ONLINE', 'OFFLINE', 'DEGRADED', name='camerastatus'), nullable=False),
        sa.Column('fps_target', sa.Integer(), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('camera_id')
    )

    op.create_table(
        'vehicles',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('license_plate', sa.String(length=32), nullable=False),
        sa.Column('vehicle_type', sa.String(length=32), nullable=False),
        sa.Column('brand', sa.String(length=64), nullable=True),
        sa.Column('model', sa.String(length=64), nullable=True),
        sa.Column('color', sa.String(length=32), nullable=True),
        sa.Column('plate_confidence', sa.Float(), nullable=True),
        sa.Column('is_registered', sa.Boolean(), nullable=False),
        sa.Column('first_seen', sa.DateTime(), nullable=False),
        sa.Column('last_seen', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicles_license_plate'), 'vehicles', ['license_plate'], unique=False)

    op.create_table(
        'detection_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('camera_id', sa.String(length=64), nullable=False),
        sa.Column('tracking_id', sa.Integer(), nullable=False),
        sa.Column('vehicle_type', sa.String(length=32), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('bbox_json', sa.Text(), nullable=False),
        sa.Column('license_plate', sa.String(length=32), nullable=True),
        sa.Column('plate_confidence', sa.Float(), nullable=True),
        sa.Column('snapshot_path', sa.String(length=512), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['camera_id'], ['cameras.camera_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_detection_logs_camera_id'), 'detection_logs', ['camera_id'], unique=False)
    op.create_index(op.f('ix_detection_logs_license_plate'), 'detection_logs', ['license_plate'], unique=False)

    op.create_table(
        'parking_slots',
        sa.Column('slot_id', sa.String(length=64), nullable=False),
        sa.Column('camera_id', sa.String(length=64), nullable=False),
        sa.Column('zone', sa.String(length=64), nullable=False),
        sa.Column('coordinates_json', sa.Text(), nullable=False),
        sa.Column('state', sa.Enum('FREE', 'OCCUPIED', 'RESERVED', 'UNKNOWN', name='slotstate'), nullable=False),
        sa.Column('is_reserved', sa.Boolean(), nullable=False),
        sa.Column('current_vehicle_id', sa.String(length=36), nullable=True),
        sa.Column('current_session_id', sa.String(length=64), nullable=True),
        sa.Column('last_state_change', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.String(length=32), nullable=True),
        sa.Column('updated_at', sa.String(length=32), nullable=True),
        sa.PrimaryKeyConstraint('slot_id')
    )
    op.create_index(op.f('ix_parking_slots_camera_id'), 'parking_slots', ['camera_id'], unique=False)

    op.create_table(
        'parking_sessions',
        sa.Column('session_uid', sa.String(length=64), nullable=False),
        sa.Column('slot_id', sa.String(length=64), nullable=False),
        sa.Column('camera_id', sa.String(length=64), nullable=True),
        sa.Column('license_plate', sa.String(length=32), nullable=True),
        sa.Column('vehicle_id', sa.String(length=36), nullable=True),
        sa.Column('tracking_id', sa.Integer(), nullable=True),
        sa.Column('entry_time', sa.String(length=32), nullable=False),
        sa.Column('exit_time', sa.String(length=32), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('entry_snapshot', sa.String(length=512), nullable=True),
        sa.Column('exit_snapshot', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.String(length=32), nullable=True),
        sa.Column('updated_at', sa.String(length=32), nullable=True),
        sa.PrimaryKeyConstraint('session_uid')
    )
    op.create_index(op.f('ix_parking_sessions_is_active'), 'parking_sessions', ['is_active'], unique=False)
    op.create_index(op.f('ix_parking_sessions_license_plate'), 'parking_sessions', ['license_plate'], unique=False)
    op.create_index(op.f('ix_parking_sessions_slot_id'), 'parking_sessions', ['slot_id'], unique=False)

    op.create_table(
        'parking_events',
        sa.Column('event_id', sa.String(length=64), nullable=False),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('slot_id', sa.String(length=64), nullable=True),
        sa.Column('session_uid', sa.String(length=64), nullable=True),
        sa.Column('license_plate', sa.String(length=32), nullable=True),
        sa.Column('timestamp', sa.String(length=32), nullable=False),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('event_id')
    )
    op.create_index(op.f('ix_parking_events_event_type'), 'parking_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_parking_events_license_plate'), 'parking_events', ['license_plate'], unique=False)
    op.create_index(op.f('ix_parking_events_slot_id'), 'parking_events', ['slot_id'], unique=False)

    op.create_table(
        'analytics_snapshots',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('metric_type', sa.String(length=64), nullable=False),
        sa.Column('timestamp', sa.String(length=32), nullable=False),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_analytics_snapshots_metric_type'), 'analytics_snapshots', ['metric_type'], unique=False)
    op.create_index(op.f('ix_analytics_snapshots_timestamp'), 'analytics_snapshots', ['timestamp'], unique=False)

    op.create_table(
        'reports',
        sa.Column('report_id', sa.String(length=64), nullable=False),
        sa.Column('report_type', sa.String(length=64), nullable=False),
        sa.Column('format', sa.String(length=16), nullable=False),
        sa.Column('parameters_json', sa.Text(), nullable=True),
        sa.Column('file_path', sa.String(length=512), nullable=True),
        sa.Column('generated_at', sa.String(length=32), nullable=False),
        sa.Column('summary_json', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('report_id')
    )
    op.create_index(op.f('ix_reports_report_type'), 'reports', ['report_type'], unique=False)


def downgrade() -> None:
    op.drop_table('reports')
    op.drop_table('analytics_snapshots')
    op.drop_table('parking_events')
    op.drop_table('parking_sessions')
    op.drop_table('parking_slots')
    op.drop_table('detection_logs')
    op.drop_table('vehicles')
    op.drop_table('cameras')
