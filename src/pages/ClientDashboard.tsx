import BottomNav from '@/components/BottomNav';
import ClientProfileSection from '@/components/ClientProfileSection';
import ClientPendingShifts from '@/components/ClientPendingShifts';

const ClientDashboard = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="care-gradient pt-12 pb-24 px-6">
        <h1 className="text-xl font-semibold text-white text-center">Client Profile</h1>
      </div>

      {/* Pending Shift Approvals */}
      <div className="px-4 -mt-16 mb-4">
        <ClientPendingShifts />
      </div>

      {/* Client Profile Info */}
      <div className="px-4">
        <ClientProfileSection />
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default ClientDashboard;
