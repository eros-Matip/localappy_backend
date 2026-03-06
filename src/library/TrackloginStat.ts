import DailyLoginStat from "../models/DailyLogin";

type Role = "customer" | "owner" | "admin";

interface TrackLoginStatParams {
  role: Role;
}

const getTodayDateString = () => {
  return new Date().toISOString().slice(0, 10);
};

export const trackLoginStat = async ({ role }: TrackLoginStatParams) => {
  const date = getTodayDateString();

  let stat = await DailyLoginStat.findOne({ date });

  if (!stat) {
    stat = new DailyLoginStat({
      date,
      totalConnections: 0,
      customerConnections: 0,
      ownerConnections: 0,
      adminConnections: 0,
    });
  }

  stat.totalConnections += 1;

  if (role === "customer") {
    stat.customerConnections += 1;
  } else if (role === "owner") {
    stat.ownerConnections += 1;
  } else if (role === "admin") {
    stat.adminConnections += 1;
  }

  await stat.save();
};
