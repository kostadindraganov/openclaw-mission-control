import { HeroKicker } from "@/components/atoms/HeroKicker";

export function HeroCopy() {
  return (
    <div className="space-y-6">
      <HeroKicker>Mission Control</HeroKicker>
      <div className="space-y-4">
        <h1 className="font-heading text-4xl font-semibold leading-tight text-strong sm:text-5xl lg:text-6xl">
          Enterprise control for
          <br />
          autonomous execution.
        </h1>
        <p className="max-w-xl text-base text-muted sm:text-lg">
          Coordinate boards, agents, and approvals in one command layer. No
          status meetings. No blind spots. Just durable execution.
        </p>
      </div>
    </div>
  );
}
