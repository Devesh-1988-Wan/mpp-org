import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Rocket, Target, Calendar, Users, TrendingUp } from "lucide-react";

interface WelcomeOnboardingProps {
  onComplete: () => void;
  onStartProject: () => void;
}

export function WelcomeOnboarding({ onComplete, onStartProject }: WelcomeOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Project Manager Pro! 🎉",
      description: "Your professional project planning companion",
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Rocket className="w-10 h-10 text-primary" />
          </div>
          <p className="text-muted-foreground">
            Organize tasks, track milestones, manage dependencies, and export professional reports - all in one place.
          </p>
        </div>
      )
    },
    {
      title: "Key Features at a Glance",
      description: "Everything you need for successful project management",
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
            <Target className="w-6 h-6 text-primary" />
            <div>
              <div className="font-medium">Smart Planning</div>
              <div className="text-sm text-muted-foreground">Tasks, milestones & dependencies</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
            <Calendar className="w-6 h-6 text-success" />
            <div>
              <div className="font-medium">Visual Timeline</div>
              <div className="text-sm text-muted-foreground">Interactive Gantt charts</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
            <Users className="w-6 h-6 text-warning" />
            <div>
              <div className="font-medium">Team Management</div>
              <div className="text-sm text-muted-foreground">Assign & track progress</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-milestone" />
            <div>
              <div className="font-medium">Smart Reports</div>
              <div className="text-sm text-muted-foreground">Analytics & insights</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Ready to Start Planning?",
      description: "Choose how you'd like to begin your project journey",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={onStartProject}
              className="flex-1 h-16 flex flex-col space-y-1"
            >
              <Target className="w-6 h-6" />
              <span>Create New Project</span>
              <span className="text-xs opacity-80">Start from scratch</span>
            </Button>
            <Button 
              variant="outline"
              onClick={onComplete}
              className="flex-1 h-16 flex flex-col space-y-1"
            >
              <Rocket className="w-6 h-6" />
              <span>Explore Demo</span>
              <span className="text-xs opacity-80">See sample project</span>
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            You can always switch between projects or create new ones later
          </p>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-professional/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 space-y-6">
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-8 rounded-full transition-all duration-300 ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mx-auto">
            Step {currentStep + 1} of {steps.length}
          </Badge>
          <h1 className="text-3xl font-bold">{currentStepData.title}</h1>
          <p className="text-lg text-muted-foreground">{currentStepData.description}</p>
        </div>

        <div className="py-8">
          {currentStepData.content}
        </div>

        {/* Navigation */}
        {currentStep < steps.length - 1 && (
          <div className="flex justify-between items-center pt-6">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 2 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        )}

        {currentStep === 0 && (
          <div className="flex justify-center pt-6">
            <Button onClick={handleNext} size="lg">
              Let's Get Started!
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}