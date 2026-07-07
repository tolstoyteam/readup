import ProfileScreen from "@/features/profile/screens/profile-screen";
import { TabScreenRoot } from "@/shared/components/tab-screen-root";

export default function AccountTab() {
  return (
    <TabScreenRoot>
      <ProfileScreen />
    </TabScreenRoot>
  );
}
