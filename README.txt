PartHound v4.4

What changed:
- Universal Year > Make > Model vehicle picker on the main search screen.
- VIN decode directly on the main search screen.
- You no longer need to add a vehicle to the garage before searching.
- Garage is optional for vehicles you use often.
- Search history chips.
- Updated industrial icon to a magnifying-glass + wrench mark (no PH letter block).
- Existing saved garage, listings and saved-part data migrate from v3 where possible.

Updating your Netlify site:
1. Unzip this package.
2. In Netlify, open the SAME PartHound site you already deployed.
3. Deploy the contents of the parthound folder as a new deploy.
4. Do not create a new site if you want your existing home-screen app URL to stay the same.
5. Open PartHound once while online. The service worker will install the v4 cache.
6. If the old screen remains, fully close PartHound and reopen it. If needed, refresh once in Chrome.

Vehicle data:
PartHound uses NHTSA vPIC for VIN decode and broad Year/Make/Model selection. Trim/engine can be entered manually when the model list is not granular enough.

PIN hotfix: corrected numeric PIN validation and bumped service-worker cache.


v4.4 Torque Specs update:
- Dedicated vehicle-specific Torque Specs quick-reference section inside Service Manual.
- Search by component, fastener, note or source.
- Enter values in ft-lb or N·m; PartHound automatically shows both units.
- Supports additional angle / replace-bolt / thread-condition instructions.
- Torque specs are included in PartHound backup export/import.
- Service-worker cache bumped so Netlify/PWA clients receive the update.


v4.4.1: Removed the local PIN/app-lock feature entirely. Existing ph_lock_hash_v42 values are cleared on launch.

v4.4.2: Hard reset build. Removed obsolete lock styling, renamed the service worker, clears legacy PartHound caches/lock state, and includes reset.html for stubborn installed-PWA caches.


v4.4.3: Search cleanup update. Part/OEM search text and recent searches are now session-only and start blank on a fresh launch. Garage, selected vehicle context, saved parts, listings, notes, service-manual notes, torque specs, and other saved data are preserved.
