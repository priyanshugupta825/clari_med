from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, BigInteger, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Supabase Storage bucket path
    file_url = Column(String(1000), nullable=False)   # Signed or public storage URL
    mime_type = Column(String(100), nullable=True)   # e.g., application/pdf, image/jpeg
    file_size_bytes = Column(BigInteger, nullable=True)
    file_data_base64 = Column(Text, nullable=True)   # Base64 encoded file for fail-proof streaming
    
    document_type = Column(String(50), default="prescription", nullable=False)  # prescription, lab_report, discharge_summary, invoice, vaccine_cert, scan
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    
    processing_status = Column(String(30), default="pending", nullable=False)  # pending, processing, completed, failed
    processing_error = Column(Text, nullable=True)
    
    ai_summary = Column(Text, nullable=True)  # Short Gemini generated overview
    extracted_metadata = Column(JSON, default=dict, nullable=False)  # Full raw extraction dictionary
    tags = Column(JSON, default=list, nullable=False)  # e.g., ["cardiology", "apollo", "dr_sharma"]
    
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="documents")
    extracted_records = relationship("ExtractedRecord", back_populates="document", cascade="all, delete-orphan")
    medicines = relationship("Medicine", back_populates="document")
    lab_results = relationship("LabResult", back_populates="document")
