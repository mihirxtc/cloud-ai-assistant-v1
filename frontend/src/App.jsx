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
  Cloud, Shield, Code, Play, Terminal, RefreshCw, AlertTriangle, Server,
  Database, Network, Lock, ChevronRight, CheckCircle2, XCircle, DollarSign,
  Cpu, HardDrive, Globe, Zap, Brain, Settings, ChevronDown, Check, AlertOctagon,
  Info, MessageSquare, Sparkles, X, Key, Activity, BarChart3, Clock, Bot, Hammer,
  LayoutDashboard, Layers, ShieldCheck, Wallet, Download
} from 'lucide-react';

// Configure axios to send cookies with every request
axios.defaults.withCredentials = true;
axios.defaults.baseURL = '';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = 'rgba(148, 163, 184, 0.1)';

const App = () => {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState(null);
  const [terraformCode, setTerraformCode] = useState('');
  const [execLogs, setExecLogs] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [availableModels, setAvailableModels] = useState({});
  const [selectedModel, setSelectedModel] = useState('codellama:7b');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [terraformSummary, setTerraformSummary] = useState(null);
  const [securityAnalysis, setSecurityAnalysis] = useState(null);
  const [costAnalysis, setCostAnalysis] = useState(null);
  const [awsCredentials, setAwsCredentials] = useState({
    aws_access_key_id: '',
    aws_secret_access_key: '',
    region: 'us-east-1'
  });
  const [awsConnected, setAwsConnected] = useState(false);
  const [awsAccount, setAwsAccount] = useState(null);
  const [showAwsModal, setShowAwsModal] = useState(false);
  const [scanDuration, setScanDuration] = useState(null);
  const [showPullPrompt, setShowPullPrompt] = useState(null);
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    checkBackendHealth();
    fetchAvailableModels();
    checkAwsStatus();
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

  const checkAwsStatus = async () => {
    try {
      const res = await axios.get('/api/aws/status');
      setAwsConnected(res.data.connected);
      setAwsAccount(res.data.account);
      // Show warning if session expires soon (less than 1 hour)
      if (res.data.session_expires) {
        const expiryTime = new Date(res.data.session_expires);
        const timeUntilExpiry = expiryTime - new Date();
        const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
        if (hoursUntilExpiry < 1 && hoursUntilExpiry > 0) {
          setError(`Session expires in ${Math.round(hoursUntilExpiry * 60)} minutes. Please reconnect soon.`);
        }
      }
    } catch (err) {
      setAwsConnected(false);
    }
  };

  const logoutAWS = async () => {
    try {
      await axios.post('/api/aws/logout');
      setAwsConnected(false);
      setAwsAccount(null);
      setResources(null);
      setDashboardData(null);
      setError(null);
    } catch (err) {
      setError('Failed to logout');
    }
  };

  const connectAWS = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/aws/connect', awsCredentials);
      setAwsConnected(true);
      setAwsAccount(res.data.account);
      setShowAwsModal(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect to AWS');
    } finally {
      setLoading(false);
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
    const model = availableModels[modelName];
    if (model && !model.is_installed && model.provider === 'ollama') {
      setShowPullPrompt({ name: modelName, display_name: model.display_name });
      return;
    }

    try {
      await axios.post('/api/models/select', { model_name: modelName });
      setSelectedModel(modelName);
      setShowModelSelector(false);
      setError(null);
    } catch (err) {
      setError('Failed to select model');
    }
  };

  const pullModel = async (modelName) => {
    setIsPulling(true);
    setLoading(true);
    try {
      await axios.post('/api/models/pull', { model_name: modelName });
      // In a real app we would poll for progress, for now we just wait for the long-running call
      await fetchAvailableModels();
      setShowPullPrompt(null);
      // Automatically select it after pull
      await axios.post('/api/models/select', { model_name: modelName });
      setSelectedModel(modelName);
      setError(null);
    } catch (err) {
      setError(`Failed to install ${modelName}. Make sure Ollama is running.`);
    } finally {
      setIsPulling(false);
      setLoading(false);
    }
  };

  const scanCloud = async () => {
    if (!awsConnected) {
      setShowAwsModal(true);
      return;
    }
    setLoading(true);
    setError(null);
    const startTime = Date.now();
    try {
      const res = await axios.post('/api/scan-cloud');
      setResources(res.data.resources);
      setDashboardData(res.data.summary);
      setScanDuration(Date.now() - startTime);
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
      const res = await axios.post('/api/generate-terraform', { prompt, model_name: selectedModel });
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
      const res = await axios.post('/api/terraform/execute', { confirm: confirmed, code: terraformCode });
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
      const res = await axios.post('/api/agent/query', { query: userMessage.content, model_name: selectedModel });
      const agentMessage = { role: 'agent', content: res.data, agent_type: res.data.agent_used, timestamp: new Date() };
      setChatMessages(prev => [...prev, agentMessage]);
      if (res.data.agent_used === 'SecurityAgent') setSecurityAnalysis(res.data);
      else if (res.data.agent_used === 'CostOptimizationAgent') setCostAnalysis(res.data);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'error', content: err.response?.data?.detail || 'Agent error', timestamp: new Date() }]);
    } finally {
      setIsAgentTyping(false);
    }
  };

  const runSecurityAnalysis = async () => {
    if (!awsConnected) { setShowAwsModal(true); return; }
    setLoading(true);
    try {
      const res = await axios.post('/api/analyze/security', null, { params: { model_name: selectedModel } });
      setSecurityAnalysis(res.data);
      setActiveTab('security');
    } catch (err) {
      setError(err.response?.data?.detail || 'Security analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const runCostAnalysis = async () => {
    if (!awsConnected) { setShowAwsModal(true); return; }
    setLoading(true);
    try {
      const res = await axios.post('/api/analyze/cost', null, { params: { model_name: selectedModel } });
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

  const prepareResourceChartData = () => {
    if (!dashboardData) return null;
    return {
      labels: ['EC2', 'S3', 'VPCs', 'Security Groups', 'EBS', 'Load Balancers', 'RDS'],
      datasets: [{
        label: 'Resource Count',
        data: [
          dashboardData.ec2_count || 0, dashboardData.s3_count || 0, dashboardData.vpc_count || 0,
          dashboardData.security_group_count || 0, dashboardData.ebs_volume_count || 0,
          dashboardData.load_balancer_count || 0, dashboardData.rds_count || 0
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4
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
        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderColor: ['rgba(34, 197, 94, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 2,
        cutout: '70%'
      }]
    };
  };

  const prepareTrendData = () => {
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Resource Count',
        data: [12, 15, 13, 18, 20, 18, dashboardData ? (dashboardData.ec2_count + dashboardData.s3_count) : 22],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    };
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <header className="bg-[#161b22] border-b border-[#30363d] sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Cloud className="text-white" size={20} />
                </div>
                <span className="text-lg font-semibold text-white">Cloud AI</span>
              </div>
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'resources', label: 'Resources', icon: Layers },
                  { id: 'security', label: 'Security', icon: ShieldCheck },
                  { id: 'cost', label: 'Cost', icon: Wallet },
                  { id: 'chat', label: 'AI Agent', icon: Bot },
                  { id: 'terraform', label: 'IaC', icon: Hammer }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'}`}>
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${awsConnected ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                <Cloud size={14} />
                <span>{awsConnected ? `AWS: ${awsAccount?.slice(0, 8)}...` : 'AWS: Not Connected'}</span>
                {awsConnected && (
                  <button 
                    onClick={logoutAWS}
                    className="ml-2 text-xs px-2 py-0.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                    title="Logout"
                  >
                    Logout
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#21262d] rounded-md text-sm">
                <StatusIcon />
                <span className={backendStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>
                  {backendStatus === 'connected' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="relative">
                <button onClick={() => setShowModelSelector(!showModelSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-sm transition-colors">
                  <Brain size={14} className="text-purple-400" />
                  <span className="hidden sm:inline">{availableModels[selectedModel]?.display_name || selectedModel}</span>
                  <ChevronDown size={14} />
                </button>
                {showModelSelector && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 max-h-96 overflow-auto">
                    <div className="p-3 border-b border-[#30363d]">
                      <span className="text-xs font-semibold text-[#8b949e] uppercase">Free Models</span>
                    </div>
                    {Object.entries(availableModels).filter(([_, m]) => !m.is_paid).map(([name, model]) => (
                      <button key={name} onClick={() => selectModel(name)}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#21262d] transition-colors text-left ${selectedModel === name ? 'bg-[#1f6feb]/20' : ''}`}>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-[#c9d1d9]">{model.display_name}</div>
                            {model.is_installed ? (
                              <CheckCircle2 size={12} className="text-green-500" />
                            ) : (
                              <AlertTriangle size={12} className="text-amber-500" />
                            )}
                          </div>
                          <div className="text-xs text-[#8b949e]">{model.context_window.toLocaleString()} tokens</div>
                        </div>
                      </button>
                    ))}
                    <div className="p-3 border-b border-t border-[#30363d] mt-2">
                      <span className="text-xs font-semibold text-[#8b949e] uppercase">Paid Models</span>
                    </div>
                    {Object.entries(availableModels).filter(([_, m]) => m.is_paid).map(([name, model]) => (
                      <button key={name} onClick={() => selectModel(name)}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#21262d] transition-colors text-left ${selectedModel === name ? 'bg-[#1f6feb]/20' : ''}`}>
                        {selectedModel === name && <Check size={14} className="text-[#1f6feb]" />}
                        <div>
                          <div className="text-sm font-medium text-[#c9d1d9]">{model.display_name}</div>
                          <div className="text-xs text-[#8b949e]">API Key Required</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={scanCloud} disabled={loading || backendStatus !== 'connected'}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#21262d] disabled:cursor-not-allowed rounded-md text-sm font-medium text-white transition-colors">
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                <span className="hidden sm:inline">Scan</span>
              </button>
              <button onClick={() => setShowAwsModal(true)} className="p-2 bg-[#21262d] hover:bg-[#30363d] rounded-md transition-colors">
                <Settings size={16} className="text-[#8b949e]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-[1920px] mx-auto px-4 mt-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={20} />
            <span className="text-red-300 flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard icon={<Server size={20} />} label="EC2 Instances" value={dashboardData?.ec2_count || 0} trend="0" color="blue" loading={loading} />
              <StatCard icon={<Database size={20} />} label="S3 Buckets" value={dashboardData?.s3_count || 0} trend="0" color="green" loading={loading} />
              <StatCard icon={<Shield size={20} />} label="Security Groups" value={dashboardData?.security_group_count || 0} trend="0" color="orange" loading={loading} />
              <StatCard icon={<Network size={20} />} label="VPCs" value={dashboardData?.vpc_count || 0} trend="0" color="purple" loading={loading} />
              <StatCard icon={<HardDrive size={20} />} label="EBS Volumes" value={dashboardData?.ebs_volume_count || 0} trend="0" color="pink" loading={loading} />
              <StatCard icon={<Globe size={20} />} label="Load Balancers" value={dashboardData?.load_balancer_count || 0} trend="0" color="cyan" loading={loading} />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="text-[#1f6feb]" size={20} />
                    <h3 className="text-lg font-semibold text-white">Resource Activity</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <Clock size={14} />
                    {scanDuration && <span>Last scan: {scanDuration}ms</span>}
                    {resources?.cached && <span className="text-green-400">(Cached)</span>}
                  </div>
                </div>
                <div className="h-64">
                  <Line data={prepareTrendData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(48, 54, 61, 0.5)' }, ticks: { color: '#8b949e' } }, x: { grid: { display: false }, ticks: { color: '#8b949e' } } } }} />
                </div>
              </div>

              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="text-[#3fb950]" size={20} />
                  <h3 className="text-lg font-semibold text-white">Security Score</h3>
                </div>
                {securityAnalysis?.llm_analysis?.security_score !== undefined ? (
                  <div className="flex flex-col items-center">
                    <div className="h-48 w-48">
                      <Doughnut data={prepareSecurityChartData()} options={{ responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } }} />
                    </div>
                    <div className="mt-4 text-center">
                      <span className={`text-4xl font-bold ${securityAnalysis.llm_analysis.security_score >= 80 ? 'text-green-400' : securityAnalysis.llm_analysis.security_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {securityAnalysis.llm_analysis.security_score}
                      </span>
                      <p className="text-sm text-[#8b949e] mt-1">out of 100</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-[#8b949e] gap-4">
                    <Shield size={48} className="opacity-30" />
                    <p className="text-center">Run security analysis<br />to see your score</p>
                    <button onClick={runSecurityAnalysis} disabled={loading || !awsConnected}
                      className="px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#21262d] rounded-md text-sm font-medium transition-colors">
                      Analyze Security
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="text-[#a371f7]" size={20} />
                  <h3 className="text-lg font-semibold text-white">Resource Distribution</h3>
                </div>
                {dashboardData ? (
                  <div className="h-64">
                    <Bar data={prepareResourceChartData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(48, 54, 61, 0.5)' }, ticks: { color: '#8b949e' } }, x: { grid: { display: false }, ticks: { color: '#8b949e' } } } }} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-[#8b949e]">
                    <div className="text-center">
                      <BarChart3 size={48} className="mx-auto mb-4 opacity-30" />
                      <p>Scan your environment to see resource distribution</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="text-[#f0883e]" size={20} />
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  <ActionButton icon={<ShieldCheck size={18} />} title="Security Analysis" description="Scan for vulnerabilities and misconfigurations" color="red" onClick={runSecurityAnalysis} loading={loading} disabled={!awsConnected} />
                  <ActionButton icon={<Wallet size={18} />} title="Cost Optimization" description="Find savings opportunities across clouds" color="green" onClick={runCostAnalysis} loading={loading} disabled={!awsConnected} />
                  <ActionButton icon={<Bot size={18} />} title="Ask AI Agent" description="Chat with your infrastructure assistant" color="blue" onClick={() => setActiveTab('chat')} loading={loading} disabled={!awsConnected} />
                  <ActionButton icon={<Hammer size={18} />} title="Generate Infrastructure" description="Create Terraform from natural language" color="purple" onClick={() => setActiveTab('terraform')} loading={loading} disabled={!awsConnected} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && resources && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Layers className="text-[#1f6feb]" />
                  Infrastructure Inventory
                </h2>
                <p className="text-sm text-[#8b949e] mt-1">Deep analysis of all provisioned cloud resources</p>
              </div>
              <div className="flex items-center gap-4">
                {resources.ComplianceSummary && (
                  <div className="flex items-center gap-2 bg-[#161b22] px-3 py-1.5 rounded-lg border border-[#30363d]">
                    <ShieldCheck size={14} className={resources.ComplianceSummary.score >= 80 ? 'text-green-400' : 'text-yellow-400'} />
                    <span className="text-sm text-[#c9d1d9] font-medium">Security: {resources.ComplianceSummary.score}%</span>
                  </div>
                )}
                {resources.CostProjection && (
                  <div className="flex items-center gap-2 bg-[#161b22] px-3 py-1.5 rounded-lg border border-[#30363d]">
                    <Wallet size={14} className="text-blue-400" />
                    <span className="text-sm text-[#c9d1d9] font-medium">${resources.CostProjection.total_monthly_cost?.toFixed(2)}/mo</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-[#8b949e] bg-[#161b22] px-3 py-1.5 rounded-lg border border-[#30363d]">
                  <Clock size={14} />
                  <span>{resources.scan_timestamp ? new Date(resources.scan_timestamp).toLocaleTimeString() : 'Recent'}</span>
                </div>
                <button onClick={scanCloud} className="p-2 bg-[#1f6feb] hover:bg-[#388bfd] rounded-lg transition-colors text-white">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ResourceCard 
                title="EC2 Instances" 
                count={resources.ec2_instances?.length || 0} 
                items={resources.ec2_instances} 
                icon={<Cpu size={18} />} 
                color="blue" 
                renderItem={item => (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{item.InstanceId}</span>
                      <div className="flex gap-1">
                        {item.Reachability && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            item.Reachability.status === 'isolated' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                            item.Reachability.status === 'public' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                            'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`} title={item.Reachability.reason}>
                            {item.Reachability.status}
                          </span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${item.State === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {item.State}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#8b949e]">
                      <span className="bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">{item.InstanceType}</span>
                      <span className="truncate">{item.PublicIpAddress || item.PrivateIpAddress || 'No IP'}</span>
                    </div>
                    {item.Reachability?.status === 'exposed' && (
                      <div className="pt-1 flex items-center gap-1 text-[10px] text-red-400">
                        <AlertTriangle size={10} />
                        <span>Publicly exposed via SG</span>
                      </div>
                    )}
                  </div>
                )} 
              />
              
              <ResourceCard 
                title="S3 Buckets" 
                count={resources.s3_buckets?.length || 0} 
                items={resources.s3_buckets || []} 
                icon={<HardDrive size={18} />} 
                color="green" 
                renderItem={item => (
                  <div className="flex items-center justify-between">
                    <span className="truncate pr-4">{item.Name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${item.PublicAccess === 'blocked' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {item.PublicAccess}
                    </span>
                  </div>
                )} 
              />

              <ResourceCard 
                title="VPCs" 
                count={resources.vpcs?.length || 0} 
                items={resources.vpcs || []} 
                icon={<Network size={18} />} 
                color="purple" 
                renderItem={item => (
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{item.VpcId}</span>
                    <span className="text-[10px] text-[#8b949e]">{item.CidrBlock}</span>
                  </div>
                )} 
              />

              <ResourceCard 
                title="Security Groups" 
                count={resources.security_groups?.length || 0} 
                items={resources.security_groups || []} 
                icon={<Shield size={18} />} 
                color="orange" 
                renderItem={item => (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-white text-xs">{item.GroupId}</span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1 rounded">{item.VpcId}</span>
                    </div>
                    <p className="text-[10px] text-[#8b949e] truncate">{item.Description}</p>
                  </div>
                )} 
              />

              <ResourceCard 
                title="EBS Volumes" 
                count={resources.ebs_volumes?.length || 0} 
                items={resources.ebs_volumes || []} 
                icon={<Database size={18} />} 
                color="pink" 
                renderItem={item => (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-mono">{item.VolumeId}</span>
                      <span className="text-[10px] text-[#8b949e]">{item.Size} GB • {item.VolumeType}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${item.State === 'in-use' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                      {item.State}
                    </span>
                  </div>
                )} 
              />

              <ResourceCard 
                title="Databases (RDS)" 
                count={resources.rds_instances?.length || 0} 
                items={resources.rds_instances || []} 
                icon={<Activity size={18} />} 
                color="cyan" 
                renderItem={item => (
                  <div className="flex items-center justify-between">
                    <span className="truncate pr-4">{item.DBInstanceIdentifier}</span>
                    <span className="text-[10px] bg-green-500/10 text-green-400 px-1 rounded uppercase font-bold">{item.Status}</span>
                  </div>
                )} 
              />
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="text-red-400" />
                Security Analysis
              </h2>
              <button onClick={runSecurityAnalysis} disabled={loading || !awsConnected}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-[#21262d] rounded-md text-sm font-medium transition-colors">
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                Run Analysis
              </button>
            </div>
            {securityAnalysis ? (
              <div className="space-y-6">
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                  <div className="flex items-center gap-6">
                    <div className={`text-5xl font-bold ${securityAnalysis.llm_analysis?.security_score >= 80 ? 'text-green-400' : securityAnalysis.llm_analysis?.security_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {securityAnalysis.llm_analysis?.security_score || 'N/A'}/100
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Security Score</h3>
                      <p className="text-[#8b949e]">Risk Level: <span className={`font-medium ${securityAnalysis.llm_analysis?.risk_level === 'low' ? 'text-green-400' : securityAnalysis.llm_analysis?.risk_level === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>{securityAnalysis.llm_analysis?.risk_level?.toUpperCase() || 'Unknown'}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center">
                <Shield size={64} className="mx-auto mb-4 text-[#30363d]" />
                <p className="text-[#8b949e] mb-4">Run security analysis to see results</p>
                <button onClick={runSecurityAnalysis} disabled={loading || !awsConnected}
                  className="px-6 py-3 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#21262d] rounded-md font-medium transition-colors">
                  Start Security Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cost Tab */}
        {activeTab === 'cost' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Wallet className="text-green-400" />
                Cost Optimization
              </h2>
              <button onClick={runCostAnalysis} disabled={loading || !awsConnected}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-[#21262d] rounded-md text-sm font-medium transition-colors">
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <Wallet size={16} />}
                Analyze Costs
              </button>
            </div>
            {costAnalysis ? (
              <div className="space-y-6">
                {/* Cost Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                    <h3 className="text-sm text-[#8b949e] mb-2">Estimated Monthly</h3>
                    <p className="text-2xl font-bold text-white">{costAnalysis.cost_analysis?.monthly_cost || costAnalysis.llm_recommendations?.estimated_monthly_cost || 'N/A'}</p>
                  </div>
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                    <h3 className="text-sm text-[#8b949e] mb-2">Potential Savings</h3>
                    <p className="text-2xl font-bold text-green-400">{costAnalysis.llm_recommendations?.potential_monthly_savings || 'N/A'}</p>
                  </div>
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                    <h3 className="text-sm text-[#8b949e] mb-2">Optimization</h3>
                    <p className="text-2xl font-bold text-blue-400">{costAnalysis.llm_recommendations?.savings_percentage || 'N/A'}</p>
                  </div>
                </div>

                {/* Detailed Analysis */}
                {costAnalysis.cost_analysis && (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                    <h3 className="font-semibold text-white mb-4">Resource Cost Breakdown</h3>
                    <div className="space-y-3">
                      {costAnalysis.cost_analysis.ec2 && (
                        <div className="flex justify-between items-center p-3 bg-[#0d1117] rounded-lg">
                          <span className="text-[#c9d1d9]">EC2 Instances</span>
                          <span className="text-white font-medium">{costAnalysis.cost_analysis.ec2.monthly_cost || 'N/A'}</span>
                        </div>
                      )}
                      {costAnalysis.cost_analysis.s3 && (
                        <div className="flex justify-between items-center p-3 bg-[#0d1117] rounded-lg">
                          <span className="text-[#c9d1d9]">S3 Storage</span>
                          <span className="text-white font-medium">{costAnalysis.cost_analysis.s3.monthly_cost || 'N/A'}</span>
                        </div>
                      )}
                      {costAnalysis.cost_analysis.rds && (
                        <div className="flex justify-between items-center p-3 bg-[#0d1117] rounded-lg">
                          <span className="text-[#c9d1d9]">RDS Databases</span>
                          <span className="text-white font-medium">{costAnalysis.cost_analysis.rds.monthly_cost || 'N/A'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {costAnalysis.llm_recommendations?.recommendations && (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                    <h3 className="font-semibold text-white mb-4">AI Recommendations</h3>
                    <div className="space-y-3">
                      {costAnalysis.llm_recommendations.recommendations.map((rec, i) => (
                        <div key={i} className="p-4 bg-[#0d1117] rounded-lg border-l-4 border-green-500">
                          <p className="text-[#c9d1d9] text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw Analysis JSON */}
                {costAnalysis.analysis && (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                    <h3 className="font-semibold text-white mb-4">Detailed Analysis</h3>
                    <pre className="text-xs text-[#8b949e] overflow-auto max-h-64 bg-[#0d1117] p-4 rounded-lg">
                      {JSON.stringify(costAnalysis.analysis, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center">
                <Wallet size={64} className="mx-auto mb-4 text-[#30363d]" />
                <p className="text-[#8b949e] mb-4">Run cost analysis to see optimization opportunities</p>
                <button onClick={runCostAnalysis} disabled={loading || !awsConnected}
                  className="px-6 py-3 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#21262d] rounded-md font-medium transition-colors">
                  Start Cost Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Agent Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-140px)] flex flex-col">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#30363d] flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Bot className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI Cloud Assistant</h3>
                  <p className="text-sm text-[#8b949e]">Ask about your infrastructure or request changes</p>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 text-[#8b949e]">
                    <Bot size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="mb-4">Start a conversation with the AI agent</p>
                    <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                      {["Analyze my security posture", "Find cost savings opportunities", "Create a new S3 bucket", "Which instances are public?"].map((suggestion, i) => (
                        <button key={i} onClick={() => { setChatInput(suggestion); setTimeout(() => sendAgentMessage(), 100); }}
                          className="text-left px-4 py-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg text-sm transition-colors">
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : msg.role === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {msg.role === 'user' ? <Terminal size={16} /> : msg.role === 'error' ? <AlertTriangle size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`max-w-[70%] p-4 rounded-lg ${msg.role === 'user' ? 'bg-[#1f6feb] text-white' : msg.role === 'error' ? 'bg-red-500/10 text-red-300' : 'bg-[#21262d] text-[#c9d1d9]'}`}>
                      {msg.role === 'agent' ? (
                        <div>
                          <div className="text-xs text-[#8b949e] mb-2 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-500/30 rounded text-purple-300">{msg.agent_type}</span>
                            <span>{msg.timestamp.toLocaleTimeString()}</span>
                          </div>
                          {msg.content.analysis && <pre className="text-sm overflow-auto bg-[#0d1117] p-2 rounded">{JSON.stringify(msg.content.analysis, null, 2)}</pre>}
                        </div>
                      ) : (<p>{msg.content}</p>)}
                    </div>
                  </div>
                ))}
                {isAgentTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Bot size={16} className="text-purple-400" />
                    </div>
                    <div className="bg-[#21262d] p-4 rounded-lg">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#8b949e] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#8b949e] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#8b949e] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-[#30363d]">
                <div className="flex gap-3">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendAgentMessage()}
                    placeholder="Ask the AI agent..." className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]" />
                  <button onClick={sendAgentMessage} disabled={!chatInput.trim() || isAgentTyping || !awsConnected}
                    className="px-6 py-3 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#21262d] rounded-lg font-medium transition-colors">
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
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Hammer className="text-blue-400" />
                Infrastructure as Code
              </h2>
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
              <h3 className="font-semibold text-white mb-4">Generate Terraform from Natural Language</h3>
              <div className="flex gap-3">
                <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && generateTerraform()}
                  placeholder="e.g., Create an EC2 instance with 8GB RAM, 30GB storage..." className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]" />
                <button onClick={generateTerraform} disabled={!prompt.trim() || loading || !awsConnected}
                  className="px-6 py-3 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#21262d] rounded-lg font-medium flex items-center gap-2 transition-colors">
                  <Sparkles size={18} />
                  Generate
                </button>
              </div>
            </div>
            {terraformCode && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Generated Terraform</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setTerraformCode('')} className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-sm transition-colors">Clear</button>
                    <button onClick={planTerraform} disabled={loading || !awsConnected}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-[#21262d] rounded-md text-sm flex items-center gap-2 transition-colors">
                      <Info size={14} />
                      Plan
                    </button>
                  </div>
                </div>
                <div className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-2 text-xs text-[#8b949e]">main.tf</span>
                  </div>
                  <pre className="p-4 text-sm font-mono text-[#7ee787] overflow-auto max-h-[400px] whitespace-pre-wrap">{terraformCode}</pre>
                </div>
                {terraformSummary && (
                  <div className="mt-4 p-4 bg-[#21262d] rounded-lg">
                    <h4 className="font-medium text-white mb-2">Summary</h4>
                    <div className="text-sm text-[#8b949e] space-y-1">
                      <p>Resources to create: {terraformSummary.resources_to_add || 'Unknown'}</p>
                      <p>Estimated cost: {terraformSummary.estimated_cost || 'Unknown'}</p>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-4">
                  <button onClick={() => setShowConfirmation(true)} disabled={loading || !awsConnected}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-[#21262d] rounded-lg font-medium flex items-center gap-2 transition-colors">
                    <Play size={18} />
                    Execute Terraform
                  </button>
                  <p className="text-sm text-[#8b949e]">This will run terraform init, plan, and apply</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* AWS Credentials Modal */}
      {showAwsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="text-[#1f6feb]" />
                AWS Credentials
              </h3>
              <button onClick={() => setShowAwsModal(false)} className="p-2 hover:bg-[#21262d] rounded-lg transition-colors">
                <X size={18} className="text-[#8b949e]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-2">Access Key ID</label>
                <input type="text" value={awsCredentials.aws_access_key_id} onChange={(e) => setAwsCredentials({ ...awsCredentials, aws_access_key_id: e.target.value })}
                  placeholder="AKIAIOSFODNN7EXAMPLE" className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-[#c9d1d9] focus:outline-none focus:border-[#1f6feb]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-2">Secret Access Key</label>
                <input type="password" value={awsCredentials.aws_secret_access_key} onChange={(e) => setAwsCredentials({ ...awsCredentials, aws_secret_access_key: e.target.value })}
                  placeholder="•••••••••••••••••••••••••••••" className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-[#c9d1d9] focus:outline-none focus:border-[#1f6feb]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-2">Region</label>
                <select value={awsCredentials.region} onChange={(e) => setAwsCredentials({ ...awsCredentials, region: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-[#c9d1d9] focus:outline-none focus:border-[#1f6feb]">
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-east-2">US East (Ohio)</option>
                  <option value="us-west-1">US West (N. California)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="eu-central-1">Europe (Frankfurt)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowAwsModal(false)} className="flex-1 px-4 py-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg font-medium text-[#c9d1d9] transition-colors">Cancel</button>
              <button onClick={connectAWS} disabled={loading || !awsCredentials.aws_access_key_id || !awsCredentials.aws_secret_access_key}
                className="flex-1 px-4 py-3 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#21262d] rounded-lg font-medium text-white transition-colors">
                {loading ? <RefreshCw className="animate-spin mx-auto" size={18} /> : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <AlertTriangle className="text-yellow-400" />
              Confirm Terraform Execution
            </h3>
            <p className="text-[#8b949e] mb-4">The AI agent wants to execute changes in your AWS account:</p>
            {terraformSummary && (
              <div className="bg-[#0d1117] rounded-lg p-4 mb-4 border border-[#30363d]">
                <div className="flex justify-between mb-2">
                  <span className="text-green-400">Resources to add:</span>
                  <span className="font-bold text-white">{terraformSummary.resources_to_add || 'See plan'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b949e]">Estimated cost:</span>
                  <span className="text-white">{terraformSummary.estimated_cost || 'Unknown'}</span>
                </div>
              </div>
            )}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-400"><span className="font-bold">Warning:</span> This will create real AWS resources and may incur charges.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmation(false)} className="flex-1 px-4 py-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg font-medium text-[#c9d1d9] transition-colors">Cancel</button>
              <button onClick={() => executeTerraform(true)} disabled={loading}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-[#21262d] rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors">
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                Yes, Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Pull Prompt Modal */}
      {showPullPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Bot size={24} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">Model Not Installed</h3>
              <p className="text-[#8b949e] text-center mb-6">
                <span className="text-[#c9d1d9] font-semibold">{showPullPrompt.display_name}</span> is not found on your device. 
                Should I download and install it for you via Ollama?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => pullModel(showPullPrompt.name)}
                  disabled={isPulling}
                  className="w-full py-3 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#21262d] disabled:text-[#8b949e] rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2"
                >
                  {isPulling ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Installing Model... (Please wait)
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Yes, Install Model
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPullPrompt(null)}
                  disabled={isPulling}
                  className="w-full py-3 bg-transparent hover:bg-[#21262d] rounded-lg font-medium text-[#8b949e] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
            {isPulling && (
              <div className="h-1 w-full bg-[#30363d] overflow-hidden">
                <div className="h-full bg-[#1f6feb] animate-pulse w-full"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Components
const StatCard = ({ icon, label, value, trend, color, loading }) => {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30'
  };
  const trendColors = trend.startsWith('+') ? 'text-green-400' : trend === '0' ? 'text-gray-400' : 'text-red-400';
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-4 backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg bg-white/5 ${color === 'blue' ? 'text-blue-400' : color === 'green' ? 'text-green-400' : color === 'purple' ? 'text-purple-400' : color === 'orange' ? 'text-orange-400' : color === 'pink' ? 'text-pink-400' : 'text-cyan-400'}`}>
          {icon}
        </div>
        {!loading && <span className={`text-sm font-medium ${trendColors}`}>{trend}</span>}
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="h-8 bg-white/5 rounded animate-pulse"></div>
        ) : (
          <>
            <span className="text-2xl font-bold text-white">{value}</span>
            <p className="text-xs text-[#8b949e] mt-1">{label}</p>
          </>
        )}
      </div>
    </div>
  );
};

const ActionButton = ({ icon, title, description, color, onClick, loading, disabled }) => {
  const colors = {
    red: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20',
    green: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`w-full flex items-center gap-4 p-4 rounded-lg border ${colors[color]} transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="p-3 bg-white/5 rounded-lg">{icon}</div>
      <div className="flex-1 text-left">
        <h4 className="font-semibold text-white">{title}</h4>
        <p className="text-sm text-[#8b949e]">{description}</p>
      </div>
      <ChevronRight size={18} className="text-[#8b949e]" />
    </button>
  );
};

const ResourceCard = ({ title, count, items, icon, color, renderItem }) => {
  const colors = { 
    blue: 'border-blue-500/20', 
    green: 'border-green-500/20', 
    purple: 'border-purple-500/20', 
    orange: 'border-orange-500/20',
    pink: 'border-pink-500/20',
    cyan: 'border-cyan-500/20'
  };
  const validItems = items?.filter(item => !item.error) || [];
  return (
    <div className={`bg-[#161b22] border ${colors[color]} rounded-lg p-4 h-full flex flex-col`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <span className="px-3 py-1 bg-[#21262d] rounded-lg font-bold text-white text-xs">{count}</span>
      </div>
      <div className="space-y-2 flex-1 overflow-auto max-h-64 pr-1 scrollbar-thin scrollbar-thumb-[#30363d]">
        {validItems.length === 0 ? (
          <p className="text-sm text-[#8b949e] italic py-4 text-center">No resources found</p>
        ) : (
          validItems.map((item, i) => (
            <div key={item.id || item.InstanceId || item.Name || i} className="text-sm bg-[#0d1117]/50 border border-[#30363d]/50 rounded-lg p-3 hover:border-blue-500/30 transition-colors">
              {renderItem(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default App;
