import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

const ProgressBar = ({ currentStep, totalSteps, className }: ProgressBarProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm text-muted-foreground">
        Step {currentStep} of {totalSteps}
      </p>
      <div className="progress-track">
        <div 
          className="progress-fill bg-primary"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
