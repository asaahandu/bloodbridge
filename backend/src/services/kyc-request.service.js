import { KycRequest } from '../models/kyc-request.model.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';

const MAX_TOTAL_DOCUMENT_SIZE = 10 * 1024 * 1024;
const allowedDocumentSignatures = {
  'application/pdf': (buffer) => buffer.subarray(0, 5).equals(Buffer.from('%PDF-')),
  'image/jpeg': (buffer) => buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/png': (buffer) =>
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};

export async function submitKycRequest(hospital, hospitalName, files) {
  const normalizedHospitalName = typeof hospitalName === 'string' ? hospitalName.trim() : '';
  if (!normalizedHospitalName || normalizedHospitalName.length > 160) {
    throw new AppError('Enter a hospital name no longer than 160 characters', 400);
  }
  if (!Array.isArray(files) || files.length < 1 || files.length > 5) {
    throw new AppError('Attach between one and five documents', 400);
  }
  if (hospital.hospitalVerificationStatus === 'verified') {
    throw new AppError('This hospital is already verified', 409);
  }
  if (hospital.hospitalVerificationStatus === 'pending') {
    throw new AppError('A verification request is already under review', 409);
  }

  const totalDocumentSize = files.reduce((total, file) => total + file.size, 0);
  if (totalDocumentSize > MAX_TOTAL_DOCUMENT_SIZE) {
    throw new AppError('Documents must total 10 MB or less', 400);
  }

  const documents = files.map((file) => {
    const isValidSignature = allowedDocumentSignatures[file.mimetype]?.(file.buffer);
    if (!isValidSignature) {
      throw new AppError(`${file.originalname} is not a valid PDF, JPEG, or PNG file`, 400);
    }

    return {
      name: file.originalname.slice(0, 255),
      mimeType: file.mimetype,
      size: file.size,
      content: file.buffer,
    };
  });

  const request = await KycRequest.findOneAndUpdate(
    { hospitalId: hospital._id },
    {
      hospitalName: normalizedHospitalName,
      documents,
      status: 'pending',
      submittedAt: new Date(),
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).select('-documents.content');

  await User.findByIdAndUpdate(hospital._id, { hospitalVerificationStatus: 'pending' });

  return {
    status: request.status,
    documentCount: request.documents.length,
    submittedAt: request.submittedAt,
  };
}