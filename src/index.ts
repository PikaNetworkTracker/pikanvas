import { Hono } from "hono";
import Canvas, { GlobalFonts } from "@napi-rs/canvas";
import { PikaNetwork } from "pika-api.js";
import path from "node:path";
import fs from "node:fs";
import { MinecraftPlayerInfo } from "all-minecraft";
import { escapeColor } from "escape-minecraft-colors";
const app = new Hono();
const pika = new PikaNetwork();
app.get("/", (ctx) => ctx.text("Hello from Hono & Bun"));
GlobalFonts.registerFromPath(
  path.join(__dirname, "..", "assets", "minecraft.otf"),
  "Minecraft"
);
GlobalFonts.registerFromPath(
  path.join(__dirname, "..", "assets", "montserrat.ttf"),
  "Montserrat"
);
app.get("/profile/:username", async (ctx) => {
  const username = ctx.req.param("username");
  const data = await pika.getProfile(username);
  const canvas = Canvas.createCanvas(800, 500);
  const context = canvas.getContext("2d", {
    alpha: false,
  });
  const user = new MinecraftPlayerInfo({ usernameOrUUID: username });

  // MARK: Background

  const background = await Canvas.loadImage(
    fs.readFileSync(`assets/background${data.clan ? "-guild" : ""}.png`)
  );
  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  // MARK: User Info

  context.font = "35px Montserrat";
  context.fillStyle = "#fff";
  const avatar = await Canvas.loadImage(
    new URL(user.getHead({ helm: true }).headIsometric)
  );
  context.drawImage(avatar, 35, 35, 80, 80);
  context.fillText(data.username, 135, 85, 300);

  // MARK: Rank Info

  context.fillStyle = "#00F7FF";
  context.textAlign = "center";
  context.font = "32px Minecraft";
  const rank =
    [
      "Trial",
      "Helper",
      "Moderator",
      "SrMod",
      "Admin",
      "Developer",
      "Manager",
      "Owner",
    ].find((r) => data.rank.rankDisplay.includes(r)) ||
    data.ranks.findLast((v) => v.server === "games")?.displayName;
  context.fillText(
    escapeColor(rank || "None").replace(/\[(.*)\]/, "$1") || "None",
    125,
    270,
    160
  );
  context.fillStyle = "#00FF08";
  context.font = "20px Minecraft";
  if (data.clan) context.fillText(data.clan.owner.username, 677.5, 335, 180);
  context.fillText(
    `${data.rank.level} (${data.rank.percentage.toFixed()}%)`,
    125,
    340,
    100
  );
  const nowDays = Date.now() / 86_400_000;
  const lastDays = data.lastSeen / 86_400_000;
  const daysDiff = nowDays - lastDays;
  context.fillText(
    +daysDiff.toFixed() === 0
      ? "Today"
      : new Intl.RelativeTimeFormat("en-US", { style: "short" }).format(
          -+daysDiff.toFixed(),
          "days"
        ),
    125,
    410,
    200
  );

  // MARK: Data

  context.fillText(data.friends.length.toString(), 400, 290);

  const badgeYStart = 330; // Starting Y position for badges
  const badgeHeight = 20; // Height of each badge
  const badgeSpacing = 2; // Spacing between badges
  const badges = [
    data.discord_boosting
      ? {
          name: "Boosting Discord",
          asset: "boosting",
        }
      : null,
    data.discord_verified
      ? {
          name: "Discord Verified",
          asset: "verified",
        }
      : null,
    data.email_verified
      ? {
          name: "Email Verified",
          asset: "mail",
        }
      : null,
  ].filter((v) => v);
  badges.forEach(async (badge, index) => {
    const badgeY = badgeYStart + index * (badgeHeight + badgeSpacing);
    context.font = "17px Minecraft";
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    context.fillText(badge!.name, 400, badgeY + 25);
  });

  // MARK: Guild Info
  if (data.clan) {
    context.fillStyle = "#00F7FF";
    context.textAlign = "center";
    context.font = "32px Minecraft";
    context.fillText(`${data.clan.name} [${data.clan.tag}]`, 680, 270, 175);
    context.fillStyle = "#00FF08";
    context.font = "20px Minecraft";
    context.fillText(data.clan.owner.username, 677.5, 335, 180);
  }

  return ctx.html(`<img src="${await canvas.toDataURLAsync()}"></img>`);
});
export default app;
