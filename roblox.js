
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "method" });
  }

  const username = String(req.query.username || "").trim();

  if (!username || username.length > 20) {
    return res.status(400).json({ error: "invalid" });
  }

  try {
    const userResponse = await fetch(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false
        }),
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!userResponse.ok) {
      throw new Error("Roblox user API: " + userResponse.status);
    }

    const userData = await userResponse.json();
    const user = userData.data?.[0];

    if (!user) {
      return res.status(404).json({ error: "notfound" });
    }

    const avatarUrl =
      "https://thumbnails.roblox.com/v1/users/avatar-headshot" +
      `?userIds=${user.id}&size=150x150&format=Png&isCircular=false`;

    const avatarResponse = await fetch(avatarUrl, {
      signal: AbortSignal.timeout(10000)
    });

    if (!avatarResponse.ok) {
      throw new Error("Roblox thumbnail API: " + avatarResponse.status);
    }

    const avatarData = await avatarResponse.json();
    const thumbnail = avatarData.data?.[0];

    if (!thumbnail?.imageUrl) {
      return res.status(502).json({ error: "noavatar" });
    }

    return res.status(200).json({
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      avatarUrl: thumbnail.imageUrl
    });
  } catch (error) {
    console.error("Roblox lookup failed:", error);

    return res.status(502).json({ error: "network" });
  }
}
