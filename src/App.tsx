import { AuthProvider } from "@/context/auth-context";
import { ShopHome } from "@/components/shop/shop-home";

export default function App() {
  return (
    <AuthProvider>
      <ShopHome />
    </AuthProvider>
  );
}
