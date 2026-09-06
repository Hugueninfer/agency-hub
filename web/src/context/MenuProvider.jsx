import { useCallback, useEffect, useMemo, useState } from "react";
import * as menuApi from "../api/menu";
import { MenuContext } from "./menu-context";

export default function MenuProvider({ children }) {
  const [menuItems, setMenuItems] = useState({ main: [], settings: [] });
  const [loading, setLoading] = useState(true);

  const fetchMenu = useCallback(async () => {
    try {
      const data = await menuApi.getMenu();
      setMenuItems(data);
    } catch {
      setMenuItems({ main: [], settings: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const value = useMemo(
    () => ({
      menuItems,
      loading,
      mainItems: menuItems.main ?? [],
      settingsItems: menuItems.settings ?? [],
      refreshMenu: fetchMenu,
    }),
    [menuItems, loading, fetchMenu],
  );

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
}
