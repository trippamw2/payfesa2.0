import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Bot, Shield, TrendingDown, Sparkles } from 'lucide-react';
import { AIFraudDetectionPanel } from '@/components/admin/AIFraudDetectionPanel';
import { AIRiskScoresPanel } from '@/components/admin/AIRiskScoresPanel';
import { AIDecisionsPanel } from '@/components/admin/AIDecisionsPanel';

const AdminAIAutomation = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [activeTab, setActiveTab] = useState('fraud');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-full">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Automation Center</h1>
              <p className="text-muted-foreground">
                AI-powered fraud detection, risk scoring, and automated decisions
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Fraud Detections</span>
              </div>
              <p className="text-2xl font-bold">Active monitoring</p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Risk Analysis</span>
              </div>
              <p className="text-2xl font-bold">Real-time</p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Auto Decisions</span>
              </div>
              <p className="text-2xl font-bold">95%+ confidence</p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Model</span>
              </div>
              <p className="text-sm font-bold">Gemini 2.0 Flash</p>
            </Card>
          </div>
        </div>

        {/* AI Panels Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fraud">
              <Shield className="h-4 w-4 mr-2" />
              Fraud Detection
            </TabsTrigger>
            <TabsTrigger value="risk">
              <TrendingDown className="h-4 w-4 mr-2" />
              Risk Scores
            </TabsTrigger>
            <TabsTrigger value="decisions">
              <Sparkles className="h-4 w-4 mr-2" />
              Auto Decisions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fraud" className="space-y-4">
            <AIFraudDetectionPanel />
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <AIRiskScoresPanel />
          </TabsContent>

          <TabsContent value="decisions" className="space-y-4">
            <AIDecisionsPanel />
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="mt-6 p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Bot className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold">How AI Automation Works</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Fraud Detection:</strong> AI scans user behavior, patterns, and anomalies in real-time</li>
                <li>• <strong>Risk Scoring:</strong> Every user, group, payout, and contribution gets an AI risk score</li>
                <li>• <strong>Auto Decisions:</strong> High-confidence decisions ({">"} 95%) execute automatically; others require admin review</li>
                <li>• <strong>Continuous Learning:</strong> AI improves fraud detection based on admin feedback</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminAIAutomation;