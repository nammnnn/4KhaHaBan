// ===================================================================
// FoundationVerification — DEPRECATED
// ไฟล์นี้ถูกแทนที่ด้วย FoundationOnboarding.jsx + FoundationPending.jsx
// เก็บไว้เป็น redirect เพื่อกัน backward compatibility
// ===================================================================
import { Navigate } from 'react-router-dom';

const FoundationVerification = () => {
  return <Navigate to="/foundation/pending" replace />;
};

export default FoundationVerification;
