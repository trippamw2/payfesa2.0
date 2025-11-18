import { Users, TrendingUp, Trophy } from 'lucide-react';

interface Props {
  groupsCount: number;
  trustScore: number;
  rank: number;
}

export const StatsGrid = ({ groupsCount, trustScore, rank }: Props) => {
  return (
    <div className="grid grid-cols-3 gap-2 px-3 py-2">
      <div className="bg-card rounded-lg p-2 text-center border">
        <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
        <p className="text-lg font-bold">{groupsCount}</p>
        <p className="text-[10px] text-muted-foreground">Groups</p>
      </div>
      <div className="bg-card rounded-lg p-2 text-center border">
        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
        <p className="text-lg font-bold">{trustScore}</p>
        <p className="text-[10px] text-muted-foreground">Score</p>
      </div>
      <div className="bg-card rounded-lg p-2 text-center border">
        <Trophy className="h-4 w-4 mx-auto mb-1 text-primary" />
        <p className="text-lg font-bold">#{rank}</p>
        <p className="text-[10px] text-muted-foreground">Rank</p>
      </div>
    </div>
  );
};
