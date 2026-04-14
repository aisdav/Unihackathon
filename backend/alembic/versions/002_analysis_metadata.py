"""add analysis metadata fields

Revision ID: 002
Revises: 001
Create Date: 2026-04-14

"""
from alembic import op
import sqlalchemy as sa


revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("missing_sections", sa.JSON(), nullable=True))
    op.add_column("analyses", sa.Column("document_summary", sa.Text(), nullable=True))
    op.add_column("analyses", sa.Column("consistency_score", sa.Float(), nullable=True))
    op.add_column("analyses", sa.Column("overall_coherence", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("analyses", "overall_coherence")
    op.drop_column("analyses", "consistency_score")
    op.drop_column("analyses", "document_summary")
    op.drop_column("analyses", "missing_sections")
