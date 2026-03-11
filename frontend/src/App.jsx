import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Cloud,
  Shield,
  Code,
  Play,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Server,
  Database,
  Network,
  Lock,
  ChevronRight,
  CheckCircle2,
  XCircle,
  DollarSign,
  Cpu,
  HardDrive,
  Globe,
  Zap,
  Brain,
  Settings,
  ChevronDown,
  Check,
  AlertOctagon,
  Info,
  MessageSquare,
  Sparkles,
  X
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Chart defaults for dark theme
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = 'rgba(148, 163, 184, 0.1)';

const App = () => {
  // State
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [terraformCode, setTerraformCode] = useState('');
  const [execLogs, setExecLogs] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Model selection
  const [availableModels, setAvailableModels] = useState({});
  const [selectedModel, setSelectedModel] = useState('qwen2.5-coder:7b');
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // Agent chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  
  // Terraform execution confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [terraformSummary, setTerraformSummary] = useState(null);
  
  // Analysis results
  const [securityAnalysis, setSecurityAnalysis] = useState(null);
  const [costAnalysis, setCostAnalysis] = useState(null);

  // Initialize
  useEffect(() => {
    checkBackendHealth();
    fetchAvailableModels();
    const interval = setInterval(checkBackendHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkBackendHealth = async () => {
    try {
      await axios.get('/api/health');
      setBackendStatus('connected');
      setError(null);
    } catch (err) {
      setBackendStatus('disconnected');
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const res = await axios.get('/api/models');
      setAvailableModels(res.data.models);
      setSelectedModel(res.data.current_model);
    } catch (err) {
      console.error('Failed to fetch models');
    }
  };

  const selectModel = async (modelName) => {
    try {
      await axios.post('/api/models/select', { model_name: modelName });
      setSelectedModel(modelName);
      setShowModelSelector(false);
    } catch (err) {
      setError('Failed to select model');
    }
  };

  const scanCloud = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/scan-cloud');
      setResources(res.data.resources);
      setDashboardData(res.data.summary);
      setActiveTab('dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const generateTerraform = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/generate-terraform', { 
        prompt,
        model_name: selectedModel 
      });
      setTerraformCode(res.data.terraform_code || '');
      setTerraformSummary(res.data.summary);
      setActiveTab('terraform');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const planTerraform = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/terraform/plan');
      setTerraformSummary(res.data.summary);
      setShowConfirmation(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Plan failed');
    } finally {
      setLoading(false);
    }
  };

  const executeTerraform = async (confirmed = false) => {
    setLoading(true);
    setShowConfirmation(false);
    try {
      const res = await axios.post('/api/terraform/execute', { 
        confirm: confirmed,
        code: terraformCode
      });
      setExecLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: res.data }]);
      if (res.data.status === 'error') {
        setError(`Terraform failed: ${res.data.output?.stderr || 'Unknown'}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  const sendAgentMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { role: 'user', content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAgentTyping(true);
    
    try {
      const res = await axios.post('/api/agent/query', {
        query: userMessage.content,
        model_name: selectedModel
      });
      
      const agentMessage = {
        role: 'agent',
        content: res.data,
        agent_type: res.data.agent_used,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, agentMessage]);
      
      // If security or cost analysis, update those views
      if (res.data.agent_used === 'SecurityAgent') {
        setSecurityAnalysis(res.data);
      } else if (res.data.agent_used === 'CostOptimizationAgent') {
        setCostAnalysis(res.data);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'error',
        content: err.response?.data?.detail || 'Agent error',
        timestamp: new Date()
      }]);
    } finally {
      setIsAgentTyping(false);
    }
  };

  const runSecurityAnalysis = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/analyze/security', null, {
        params: { model_name: selectedModel }
      });
      setSecurityAnalysis(res.data);
      setActiveTab('security');
    } catch (err) {
      setError(err.response?.data?.detail || 'Security analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const runCostAnalysis = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/analyze/cost', null, {
        params: { model_name: selectedModel }
      });
      setCostAnalysis(res.data);
      setActiveTab('cost');
    } catch (err) {
      setError(err.response?.data?.detail || 'Cost analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = () => {
    if (backendStatus === 'connected') return <CheckCircle2 size={16} className="text-green-400" />;
    if (backendStatus === 'checking') return <RefreshCw size={16} className="text-yellow-400 animate-spin" />;
    return <XCircle size={16} className="text-red-400" />;
  };

  // Chart data preparation
  const prepareResourceChartData = () => {
    if (!dashboardData) return null;
    return {
      labels: ['EC2', 'S3', 'VPCs', 'Security Groups', 'EBS', 'Load Balancers', 'RDS'],
      datasets: [{
        label: 'Resource Count',
        data: [
          dashboardData.ec2_count || 0,
          dashboardData.s3_count || 0,
          dashboardData.vpc_count || 0,
          dashboardData.security_group_count || 0,
          dashboardData.ebs_volume_count || 0,
          dashboardData.load_balancer_count || 0,
          dashboardData.rds_count || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(139, 92, 246, 0.6)',
          'rgba(249, 115, 22, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(14, 165, 233, 0.6)',
          'rgba(99, 102, 241, 0.6)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(236, 72, 153, 1)',
          'rgba(14, 165, 233, 1)',
          'rgba(99, 102, 241, 1)'
        ],
        borderWidth: 1
      }]
    };
  };

  const prepareSecurityChartData = () => {
    if (!securityAnalysis?.llm_analysis?.security_score) return null;
    const score = securityAnalysis.llm_analysis.security_score;
    return {
      labels: ['Secure', 'Issues'],
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: ['rgba(34, 197, 94, 0.6)', 'rgba(239, 68, 68, 0.6)'],
        borderColor: ['rgba(34, 197, 94, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 1
      }]
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Cloud className="text-blue-400" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Cloud AI Assistant
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <StatusIcon />
                  <span className={`text-sm ${backendStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                    {backendStatus === 'connected' ? 'Backend Connected' : 'Backend Disconnected'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Model Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 transition-all"
                >
                  <Brain size={18} className="text-purple-400" />
                  <span className="text-sm">{availableModels[selectedModel]?.display_name || selectedModel}</span>
                  <ChevronDown size={16} />
                </button>
                
                {showModelSelector && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 max-h-96 overflow-auto">
                    <div className="p-3 border-b border-white/10">
                      <span className="text-sm font-semibold text-slate-300">Free / Local Models</span>
                    </div>
                    {Object.entries(availableModels)
                      .filter(([_, m]) => !m.is_paid)
                      .map(([name, model]) => (
                        <button
                          key={name}
                          onClick={() => selectModel(name)}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors ${
                            selectedModel === name ? 'bg-blue-500/20' : ''
                          }`}
                        >
                          {selectedModel === name && <Check size={16} className="text-blue-400" />}
                          <div className="text-left">
                            <div className="text-sm font-medium">{model.display_name}</div>
                            <div className="text-xs text-slate-400">Context: {model.context_window.toLocaleString()} tokens</div>
                          </div>
                        </button>
                      ))}
                    
                    <div className="p-3 border-b border-t border-white/10 mt-2">
                      <span className="text-sm font-semibold text-slate-300">Paid API Models</span>
                    </div>
                    {Object.entries(availableModels)
                      .filter(([_, m]) => m.is_paid)
                      .map(([name, model]) => (
                        <button
                          key={name}
                          onClick={() => selectModel(name)}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors ${
                            selectedModel === name ? 'bg-blue-500/20' : ''
                          }`}
                        >
                          {selectedModel === name && <Check size={16} className="text-blue-400" />}
                          <div className="text-left">
                            <div className="text-sm font-medium">{model.display_name}</div>
                            <div className="text-xs text-slate-400">API Key Required</div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              
              <button 
                onClick={scanCloud}
                disabled={loading || backendStatus !== 'connected'}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                Scan Environment
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={24} />
            <span className="text-red-300 flex-1">{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl border border-white/10 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Zap size={18} /> },
            { id: 'resources', label: 'Resources', icon: <Server size={18} /> },
            { id: 'security', label: 'Security', icon: <Shield size={18} /> },
            { id: 'cost', label: 'Cost', icon: <DollarSign size={18} /> },
            { id: 'chat', label: 'AI Agent', icon: <MessageSquare size={18} /> },
            { id: 'terraform', label: 'Terraform', icon: <Code size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pb-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={<Server size={24} />}
                label="EC2 Instances"
                value={dashboardData?.ec2_count || 0}
                color="blue"
              />
              <MetricCard
                icon={<Database size={24} />}
                label="S3 Buckets"
                value={dashboardData?.s3_count || 0}
                color="emerald"
              />
              <MetricCard
                icon={<Shield size={24} />}
                label="Security Groups"
                value={dashboardData?.security_group_count || 0}
                color="orange"
              />
              <MetricCard
                icon={<Globe size={24} />}
                label="VPCs"
                value={dashboardData?.vpc_count || 0}
                color="purple"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Resource Distribution</h3>
                {dashboardData && (
                  <Bar 
                    data={prepareResourceChartData()} 
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } } }
                    }}
                  />
                )}
                {!dashboardData && (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    Scan environment to see resource distribution
                  </div>
                )}
              </div>

              <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Security Score</h3>
                {securityAnalysis?.llm_analysis?.security_score !== undefined ? (
                  <div className="flex flex-col items-center">
                    <Doughnut 
                      data={prepareSecurityChartData()}
                      options={{
                        responsive: true,
                        cutout: '70%',
                        plugins: { legend: { position: 'bottom' } }
                      }}
                    />
                    <div className="mt-4 text-center">
                      <span className="text-3xl font-bold text-green-400">
                        {securityAnalysis.llm_analysis.security_score}/100
                      </span>
                      <p className="text-sm text-slate-400 mt-1">Security Score</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <p>Run security analysis to see security score</p>
                    <button
                      onClick={runSecurityAnalysis}
                      disabled={loading || backendStatus !== 'connected'}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 rounded-lg font-medium"
                    >
                      Run Security Analysis
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickActionCard
                title="Security Analysis"
                description="Scan for vulnerabilities and misconfigurations"
                icon={<Shield size={24} />}
                color="red"
                onClick={runSecurityAnalysis}
                loading={loading}
                disabled={backendStatus !== 'connected'}
              />
              <QuickActionCard
                title="Cost Optimization"
                description="Find savings opportunities and alternatives"
                icon={<DollarSign size={24} />}
                color="green"
                onClick={runCostAnalysis}
                loading={loading}
                disabled={backendStatus !== 'connected'}
              />
              <QuickActionCard
                title="AI Agent Chat"
                description="Ask questions about your infrastructure"
                icon={<MessageSquare size={24} />}
                color="blue"
                onClick={() => setActiveTab('chat')}
                loading={loading}
                disabled={backendStatus !== 'connected'}
              />
            </div>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && resources && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">AWS Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResourceDetailCard
                title="EC2 Instances"
                count={resources.ec2_instances?.length || 0}
                items={resources.ec2_instances}
                icon={<Cpu size={20} />}
                color="blue"
                renderItem={item => `${item.InstanceId} (${item.InstanceType}) - ${item.State}`}
              />
              <ResourceDetailCard
                title="S3 Buckets"
                count={resources.s3_buckets?.length || 0}
                items={resources.s3_buckets}
                icon={<HardDrive size={20} />}
                color="emerald"
                renderItem={item => `${item.Name} - ${item.PublicAccess || 'unknown access'}`}
              />
              <ResourceDetailCard
                title="VPCs"
                count={resources.vpcs?.length || 0}
                items={resources.vpcs}
                icon={<Network size={20} />}
                color="purple"
                renderItem={item => `${item.VpcId} - ${item.CidrBlock}`}
              />
              <ResourceDetailCard
                title="Security Groups"
                count={resources.security_groups?.length || 0}
                items={resources.security_groups}
                icon={<Lock size={20} />}
                color="orange"
                renderItem={item => `${item.GroupId} - ${item.GroupName}`}
              />
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="text-red-400" />
                Security Analysis
              </h2>
              <button
                onClick={runSecurityAnalysis}
                disabled={loading || backendStatus !== 'connected'}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 rounded-lg font-medium flex items-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Shield size={18} />}
                Run Analysis
              </button>
            </div>

            {securityAnalysis ? (
              <div className="space-y-6">
                {/* Security Score */}
                <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl font-bold ${
                      securityAnalysis.llm_analysis?.security_score >= 80 ? 'text-green-400' :
                      securityAnalysis.llm_analysis?.security_score >= 60 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {securityAnalysis.llm_analysis?.security_score || 'N/A'}/100
                    </div>
                    <div>
                      <h3 className="font-semibold">Security Score</h3>
                      <p className="text-sm text-slate-400">
                        {securityAnalysis.llm_analysis?.risk_level?.toUpperCase() || 'Unknown'} Risk Level
                      </p>
                    </div>
                  </div>
                </div>

                {/* Automated Findings */}
                {securityAnalysis.automated_findings?.length > 0 && (
                  <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <AlertOctagon className="text-orange-400" />
                      Automated Scan Findings ({securityAnalysis.automated_findings.length})
                    </h3>
                    <div className="space-y-3">
                      {securityAnalysis.automated_findings.map((finding, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${
                          finding.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                          finding.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
                          'bg-yellow-500/10 border-yellow-500/30'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              finding.severity === 'critical' ? 'bg-red-500/30 text-red-300' :
                              finding.severity === 'high' ? 'bg-orange-500/30 text-orange-300' :
                              'bg-yellow-500/30 text-yellow-300'
                            }`}>
                              {finding.severity.toUpperCase()}
                            </span>
                            <span className="text-sm text-slate-400">{finding.type}</span>
                          </div>
                          <p className="text-sm">{finding.details}</p>
                          <p className="text-sm text-slate-400 mt-2">
                            <span className="font-medium">Fix:</span> {finding.remediation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {securityAnalysis.llm_analysis?.critical_findings && (
                  <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Brain className="text-purple-400" />
                      AI Security Insights
                    </h3>
                    <div className="space-y-4">
                      {securityAnalysis.llm_analysis.critical_findings.map((finding, i) => (
                        <div key={i} className="p-4 bg-slate-700/50 rounded-xl">
                          <h4 className="font-medium text-red-300 mb-2">{finding.issue}</h4>
                          <p className="text-sm text-slate-400 mb-2">{finding.description}</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {finding.affected_resources?.map((res, j) => (
                              <span key={j} className="px-2 py-1 bg-slate-600 rounded text-xs">{res}</span>
                            ))}
                          </div>
                          <p className="text-sm text-green-400">
                            <span className="font-medium">Remediation:</span> {finding.remediation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Shield size={48} className="mx-auto mb-4 opacity-30" />
                <p>Run security analysis to see results</p>
              </div>
            )}
          </div>
        )}

        {/* Cost Tab */}
        {activeTab === 'cost' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="text-green-400" />
                Cost Optimization
              </h2>
              <button
                onClick={runCostAnalysis}
                disabled={loading || backendStatus !== 'connected'}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 rounded-lg font-medium flex items-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <DollarSign size={18} />}
                Analyze Costs
              </button>
            </div>

            {costAnalysis ? (
              <div className="space-y-6">
                {/* Cost Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-sm text-slate-400 mb-2">Estimated Monthly Cost</h3>
                    <p className="text-2xl font-bold text-white">
                      {costAnalysis.cost_analysis?.ec2?.monthly_cost || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-sm text-slate-400 mb-2">Potential Savings</h3>
                    <p className="text-2xl font-bold text-green-400">
                      {costAnalysis.llm_recommendations?.potential_monthly_savings || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-sm text-slate-400 mb-2">Optimization %</h3>
                    <p className="text-2xl font-bold text-blue-400">
                      {costAnalysis.llm_recommendations?.savings_percentage || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Cross-Cloud Comparison */}
                {costAnalysis.llm_recommendations?.cross_cloud_comparison && (
                  <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-semibold mb-4">Cross-Cloud Cost Comparison</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(costAnalysis.llm_recommendations.cross_cloud_comparison).map(([cloud, data]) => (
                        <div key={cloud} className={`p-4 rounded-xl border ${
                          cloud === 'aws' ? 'bg-orange-500/10 border-orange-500/30' :
                          cloud === 'gcp' ? 'bg-blue-500/10 border-blue-500/30' :
                          'bg-cyan-500/10 border-cyan-500/30'
                        }`}>
                          <h4 className="font-bold uppercase mb-2">{cloud}</h4>
                          <p className="text-lg font-semibold">{data.estimated_monthly || data}</p>
                          {data.savings_vs_aws && (
                            <p className="text-sm text-green-400">Save {data.savings_vs_aws}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {costAnalysis.llm_recommendations?.findings && (
                  <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-semibold mb-4">Optimization Recommendations</h3>
                    <div className="space-y-3">
                      {costAnalysis.llm_recommendations.findings.map((finding, i) => (
                        <div key={i} className="p-4 bg-slate-700/50 rounded-xl flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${
                            finding.implementation_effort === 'low' ? 'bg-green-500/20 text-green-400' :
                            finding.implementation_effort === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            <DollarSign size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{finding.finding}</h4>
                            <div className="flex gap-4 mt-2 text-sm text-slate-400">
                              <span>Current: {finding.current_cost}</span>
                              <span>→</span>
                              <span className="text-green-400">Optimized: {finding.optimized_cost}</span>
                              <span className="text-green-400 font-semibold">Save: {finding.monthly_savings}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <DollarSign size={48} className="mx-auto mb-4 opacity-30" />
                <p>Run cost analysis to see optimization opportunities</p>
              </div>
            )}
          </div>
        )}

        {/* AI Agent Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-200px)] flex flex-col">
            <div className="bg-slate-800/40 border border-white/10 rounded-2xl flex-1 flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Sparkles className="text-purple-400" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold">AI Cloud Assistant</h3>
                  <p className="text-sm text-slate-400">Ask about your infrastructure or request changes</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Start a conversation with the AI agent</p>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm">Try asking:</p>
                      {[
                        "Analyze my security posture",
                        "Find cost savings opportunities",
                        "Create a new S3 bucket with encryption",
                        "Which instances are publicly exposed?"
                      ].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setChatInput(suggestion);
                            setTimeout(() => sendAgentMessage(), 100);
                          }}
                          className="block w-full text-left px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`p-2 rounded-full ${
                      msg.role === 'user' ? 'bg-blue-500/20' :
                      msg.role === 'error' ? 'bg-red-500/20' :
                      'bg-purple-500/20'
                    }`}>
                      {msg.role === 'user' ? <Terminal size={16} /> :
                       msg.role === 'error' ? <AlertTriangle size={16} /> :
                       <Sparkles size={16} />}
                    </div>
                    <div className={`max-w-[70%] p-4 rounded-2xl ${
                      msg.role === 'user' ? 'bg-blue-600 text-white' :
                      msg.role === 'error' ? 'bg-red-500/20 text-red-300' :
                      'bg-slate-700/50'
                    }`}>
                      {msg.role === 'agent' ? (
                        <div>
                          <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-500/30 rounded">{msg.agent_type}</span>
                            <span>{msg.timestamp.toLocaleTimeString()}</span>
                          </div>
                          {msg.content.analysis && (
                            <pre className="text-sm overflow-auto bg-slate-800/50 p-2 rounded-lg">
                              {JSON.stringify(msg.content.analysis, null, 2)}
                            </pre>
                          )}
                          {msg.content.terraform_code && (
                            <div>
                              <p className="text-sm mb-2">Generated Terraform code:</p>
                              <pre className="text-xs overflow-auto bg-slate-800/50 p-2 rounded-lg">
                                {msg.content.terraform_code.substring(0, 500)}...
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {isAgentTyping && (
                  <div className="flex gap-3">
                    <div className="p-2 rounded-full bg-purple-500/20">
                      <Sparkles size={16} />
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-2xl">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendAgentMessage()}
                    placeholder="Ask the AI agent..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={sendAgentMessage}
                    disabled={!chatInput.trim() || isAgentTyping || backendStatus !== 'connected'}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 rounded-xl font-semibold"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Terraform Tab */}
        {activeTab === 'terraform' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Code className="text-blue-400" />
                Infrastructure as Code
              </h2>
            </div>

            {/* Generation Input */}
            <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Generate Terraform from Natural Language</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && generateTerraform()}
                  placeholder="e.g., Create an EC2 instance with 8GB RAM, 30GB storage, Linux AMI..."
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={generateTerraform}
                  disabled={!prompt.trim() || loading || backendStatus !== 'connected'}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl font-semibold flex items-center gap-2"
                >
                  <Sparkles size={20} />
                  Generate
                </button>
              </div>
            </div>

            {/* Terraform Code Display */}
            {terraformCode && (
              <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Generated Terraform</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTerraformCode('')}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
                    >
                      Clear
                    </button>
                    <button
                      onClick={planTerraform}
                      disabled={loading || backendStatus !== 'connected'}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 rounded-lg text-sm flex items-center gap-2"
                    >
                      <Info size={16} />
                      Plan
                    </button>
                  </div>
                </div>
                
                <div className="bg-slate-950 rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    <span className="ml-2 text-xs text-slate-500">main.tf</span>
                  </div>
                  <pre className="p-4 text-sm font-mono text-blue-300 overflow-auto max-h-[400px] whitespace-pre-wrap">
                    {terraformCode}
                  </pre>
                </div>

                {/* Terraform Summary */}
                {terraformSummary && (
                  <div className="mt-4 p-4 bg-slate-700/50 rounded-xl">
                    <h4 className="font-medium mb-2">Summary</h4>
                    <div className="text-sm text-slate-400 space-y-1">
                      <p>Resources to create: {terraformSummary.resources_to_add || 'Unknown'}</p>
                      <p>Estimated cost: {terraformSummary.estimated_cost || 'Unknown'}</p>
                    </div>
                  </div>
                )}

                {/* Execute Button */}
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={() => setShowConfirmation(true)}
                    disabled={loading || backendStatus !== 'connected'}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 rounded-xl font-semibold flex items-center gap-2"
                  >
                    <Play size={20} />
                    Execute Terraform
                  </button>
                  <p className="text-sm text-slate-400">
                    This will run terraform init, plan, and apply
                  </p>
                </div>
              </div>
            )}

            {/* Execution Logs */}
            {execLogs.length > 0 && (
              <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold mb-4">Execution Logs</h3>
                <div className="space-y-3 max-h-64 overflow-auto">
                  {execLogs.map((log, i) => (
                    <div key={i} className="p-3 bg-slate-950 rounded-lg text-xs font-mono">
                      <span className="text-slate-500">[{log.time}]</span>
                      <pre className="mt-1 text-slate-300 whitespace-pre-wrap">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-yellow-400" />
              Confirm Terraform Execution
            </h3>
            <p className="text-slate-400 mb-4">
              The AI agent wants to execute the following changes in your AWS account:
            </p>
            
            {terraformSummary && (
              <div className="bg-slate-900 rounded-xl p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-green-400">Resources to add:</span>
                  <span className="font-bold">{terraformSummary.resources_to_add || 'See plan'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated cost:</span>
                  <span>{terraformSummary.estimated_cost || 'Unknown'}</span>
                </div>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-400">
                <span className="font-bold">Warning:</span> This will create real resources in your AWS account and may incur charges. 
                Review the generated code carefully before proceeding.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => executeTerraform(true)}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                Yes, Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component: Metric Card
const MetricCard = ({ icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400'
  };

  return (
    <div className={`${colors[color]} rounded-2xl p-6 border`}>
      <div className="flex items-center justify-between">
        <div className="p-3 bg-white/5 rounded-xl">{icon}</div>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="text-slate-400 mt-2">{label}</p>
    </div>
  );
};

// Component: Quick Action Card
const QuickActionCard = ({ title, description, icon, color, onClick, loading, disabled }) => {
  const colors = {
    red: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20',
    green: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${colors[color]} rounded-2xl p-6 border text-left transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="p-3 bg-white/5 rounded-xl">{icon}</div>
        {loading && <RefreshCw className="animate-spin" size={18} />}
      </div>
      <h3 className="font-semibold mt-4">{title}</h3>
      <p className="text-sm text-slate-400 mt-1">{description}</p>
    </button>
  );
};

// Component: Resource Detail Card
const ResourceDetailCard = ({ title, count, items, icon, color, renderItem }) => {
  const colors = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400'
  };

  const validItems = items?.filter(item => !item.error) || [];

  return (
    <div className={`${colors[color]} rounded-2xl p-6 border`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <span className="px-3 py-1 bg-white/10 rounded-lg font-bold">{count}</span>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-auto">
        {validItems.length === 0 ? (
          <p className="text-sm opacity-60">No resources found</p>
        ) : (
          validItems.slice(0, 5).map((item, i) => (
            <div key={i} className="text-sm bg-white/5 rounded-lg p-2">
              {renderItem(item)}
            </div>
          ))
        )}
        {validItems.length > 5 && (
          <p className="text-xs opacity-60">+{validItems.length - 5} more</p>
        )}
      </div>
    </div>
  );
};

export default App;
