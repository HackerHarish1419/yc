import { useState, useEffect } from 'react';
import { Cpu, CheckCircle, ArrowRight, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';

function AICopilotCard({ recommendation, isLoading, onApprove }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  // Typewriter effect for primary action
  useEffect(() => {
    if (recommendation && !isLoading) {
      setIsTyping(true);
      setDisplayedText('');
      const text = recommendation.primary_action;
      let index = 0;
      
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(prev => prev + text[index]);
          index++;
        } else {
          setIsTyping(false);
          setShowFullContent(true);
          clearInterval(interval);
        }
      }, 20);
      
      return () => clearInterval(interval);
    }
  }, [recommendation, isLoading]);

  if (isLoading) {
    return (
      <div className="border-2 border-[#007AFF] bg-[#0A0A0A] copilot-pulse" data-testid="copilot-card-loading">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2A2D35] bg-[#007AFF]/10">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#007AFF] animate-pulse" />
            <span className="text-xs font-mono text-[#007AFF] tracking-[0.2em] uppercase font-bold">
              COPILOT ANALYZING
            </span>
          </div>
        </div>
        
        {/* Loading Animation */}
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#007AFF] animate-pulse"></div>
            <div className="w-2 h-2 bg-[#007AFF] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-[#007AFF] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-xs font-mono text-[#8F939D] mt-3">
            Processing anomaly data and calculating ROE-compliant response vectors...
          </p>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  return (
    <div className="border-2 border-[#007AFF] bg-[#0A0A0A]" data-testid="copilot-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2A2D35] bg-[#007AFF]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#007AFF]" />
            <span className="text-xs font-mono text-[#007AFF] tracking-[0.2em] uppercase font-bold">
              COPILOT RECOMMENDATION
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#5C5F66]">
            ID: {recommendation.recommendation_id}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Primary Action */}
        <div>
          <div className="text-[10px] font-mono text-[#5C5F66] uppercase tracking-wider mb-2">
            PRIMARY ACTION
          </div>
          <p className="text-sm font-mono text-white leading-relaxed" data-testid="copilot-primary-action">
            {displayedText}
            {isTyping && <span className="inline-block w-2 h-4 bg-[#007AFF] ml-1 animate-pulse"></span>}
          </p>
        </div>
        
        {/* Recovery Steps - Show after typing */}
        {showFullContent && (
          <>
            <div>
              <div className="text-[10px] font-mono text-[#5C5F66] uppercase tracking-wider mb-2">
                RECOVERY PROTOCOL
              </div>
              <div className="space-y-2">
                {recommendation.recovery_steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs font-mono text-[#8F939D]">
                    <ArrowRight className="w-3 h-3 text-[#007AFF] mt-0.5 flex-shrink-0" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Reassignment Vectors */}
            {recommendation.reassignment_vectors && recommendation.reassignment_vectors.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-[#5C5F66] uppercase tracking-wider mb-2">
                  SWARM REASSIGNMENT
                </div>
                <div className="space-y-1">
                  {recommendation.reassignment_vectors.map((vector, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs font-mono p-2 bg-[#050505] border border-[#2A2D35]">
                      <span className="text-[#007AFF] font-bold">{vector.drone_id}</span>
                      <span className="text-[#5C5F66]">→</span>
                      <span className="text-[#FFB300]">{vector.action}</span>
                      {vector.note && <span className="text-[#8F939D]">({vector.note})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* ROE Compliance */}
            <div className="flex items-center gap-2 p-2 bg-[#00FF66]/10 border border-[#00FF66]/30">
              <Shield className="w-4 h-4 text-[#00FF66]" />
              <div>
                <div className="text-[10px] font-mono text-[#5C5F66] uppercase tracking-wider">
                  ROE COMPLIANCE
                </div>
                <div className="text-xs font-mono text-[#00FF66]" data-testid="copilot-roe-status">
                  {recommendation.roe_compliance}
                </div>
              </div>
            </div>
            
            {/* Confidence */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#5C5F66]">CONFIDENCE:</span>
              <span className={`font-bold ${
                recommendation.confidence === 'HIGH' ? 'text-[#00FF66]' :
                recommendation.confidence === 'MEDIUM' ? 'text-[#FFB300]' :
                'text-[#FF3B30]'
              }`}>
                {recommendation.confidence}
              </span>
            </div>
            
            {/* Approve Button */}
            <Button
              onClick={() => onApprove(recommendation.recommendation_id)}
              className="w-full bg-[#007AFF] text-white font-bold uppercase tracking-widest py-3 rounded-none
                hover:bg-white hover:text-[#0A0A0A] transition-colors"
              data-testid="approve-copilot-route"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              APPROVE & EXECUTE
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default AICopilotCard;
