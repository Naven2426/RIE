import React, { useState, useEffect, useRef } from 'react';
import { Shield, Upload, FileText, Eye, Award, Layers, ArrowUpDown, LogIn, UserPlus, LogOut, Download } from 'lucide-react';
import './App.css';

function App() {
  const [nodeStatus, setNodeStatus] = useState('Checking...');
  const [uploadState, setUploadState] = useState('idle'); 
  const [selectedFileType, setSelectedFileType] = useState('image'); // image, video, audio
  const [selectedFile, setSelectedFile] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]); 
  const [filterType, setFilterType] = useState('latest'); 

  const [userToken, setUserToken] = useState(localStorage.getItem('rie_auth_token') || null);
  const [activeUser, setActiveUser] = useState(localStorage.getItem('rie_username') || '');
  const [authMode, setAuthMode] = useState('login'); 
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  const fileInputRef = useRef(null);

  const [verificationData, setVerificationData] = useState({
    metadata: { gps: "N/A", timestamp: "N/A", device: "N/A", score: 0 },
    environment: { locationMatch: "N/A", weatherMatch: "N/A", score: 0 },
    aiDetection: { forgeryDetected: "N/A", artifactScore: "0% Integrity", score: 0, cryptographicHash: "N/A" },
    finalRealityScore: 0
  });

  useEffect(() => {
    checkGatewayStatus();
    if (userToken) {
      fetchHistoryData();
    }
  }, [userToken]);

  useEffect(() => {
    resetFileInputElement();
  }, [selectedFileType]);

  const checkGatewayStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/status').catch(() => null);
      setNodeStatus(res && res.ok ? 'Online' : 'Offline');
    } catch {
      setNodeStatus('Offline');
    }
  };

  const fetchHistoryData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ai/history', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success && result.data) {
        setHistoryLogs(result.data); 
      } else if (response.status === 401 || response.status === 403) {
        handleLogoutAction();
      }
    } catch (err) {
      console.error("Failed tracking history registers data.");
    }
  };

  const resetFileInputElement = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; 
    }
  };

  const getNativeAcceptStringValue = () => {
    if (selectedFileType === 'image') return "image/png, image/jpeg, image/jpg";
    if (selectedFileType === 'video') return "video/mp4, video/mkv, video/quicktime";
    if (selectedFileType === 'audio') return "audio/mpeg, audio/wav, audio/x-m4a, audio/mp3";
    return "*/*";
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleAuthSubmitAction = async (e) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return alert('Fill up fields, bro!');

    const endpointUrl = `http://localhost:5000/api/auth/${authMode}`;
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const result = await response.json();

      if (result.success) {
        if (authMode === 'register') {
          alert('Account created! Switching to login, bro!');
          setAuthMode('login');
          setPasswordInput('');
        } else {
          localStorage.setItem('rie_auth_token', result.token);
          localStorage.setItem('rie_username', result.username);
          setUserToken(result.token);
          setActiveUser(result.username);
          setUsernameInput('');
          setPasswordInput('');
        }
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert('Authentication channel disconnected.');
    }
  };

  const handleLogoutAction = () => {
    localStorage.removeItem('rie_auth_token');
    localStorage.removeItem('rie_username');
    setUserToken(null);
    setActiveUser('');
    setHistoryLogs([]);
    setUploadState('idle');
  };

  const triggerRealUpload = async () => {
    if (!selectedFile) return alert('Please select a validated file first, Naveen!');
    setUploadState('uploading');
    
    const formData = new FormData();
    formData.append('mediaAsset', selectedFile);
    formData.append('assetType', selectedFileType);

    try {
      const response = await fetch('http://localhost:5000/api/ai/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userToken}` },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const realCoords = result.data.coordinates;
        const aiData = result.data.ai_forensics; 
        const fileHash = result.data.hash || "No Hash Generated";

        const formattedGPS = (realCoords && realCoords.latitude) 
          ? `${realCoords.latitude.toFixed(4)}° N, ${realCoords.longitude.toFixed(4)}° E`
          : "No Native GPS Tags Embedded";

        const formattedDevice = result.data.device || "Unknown Hardware Signature";
        const formattedTime = new Date(result.data.timestamp).toLocaleString();
        const pixelScore = aiData ? Math.round(aiData.confidence_score || 0) : 0;
        
        const metadataScore = (realCoords && realCoords.latitude) ? 95 : (selectedFileType === 'video' ? 75 : (selectedFileType === 'audio' ? 80 : 20));
        const blendedScore = Math.round((metadataScore * 0.3) + (pixelScore * 0.7));

        const customMessage = aiData && aiData.analysis_msg ? aiData.analysis_msg : "Clear";

        setVerificationData({
          metadata: { gps: formattedGPS, timestamp: formattedTime, device: formattedDevice, score: metadataScore },
          environment: { locationMatch: (realCoords && realCoords.latitude) ? "Live Coordinates Mapped" : "No GPS Metadata", weatherMatch: "Skipped", score: 0 },
          aiDetection: { forgeryDetected: customMessage, artifactScore: `${pixelScore}% Integrity`, score: pixelScore, cryptographicHash: fileHash },
          finalRealityScore: blendedScore
        });
        
        setUploadState('analyzed');
        fetchHistoryData(); 
      }
    } catch (err) {
      alert('Error connecting to pipeline!');
      setUploadState('idle');
    }
  };

  // 📝 FORENSIC PRINT ENGINE FUNCTION BLOCK
  const generateForensicReportPrintStream = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>RIE FORGERY SCAN REPORT - ${selectedFile ? selectedFile.name : 'Asset'}</title>
          <style>
            body { font-family: monospace; padding: 40px; background-color: #fff; color: #000; line-height: 1.5; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
            .seal-box { border: 2px solid #000; padding: 15px; margin-bottom: 25px; background: #f9f9f9; }
            .score { font-size: 28px; font-weight: bold; margin: 10px 0; }
            .section-title { font-weight: bold; text-transform: uppercase; border-bottom: 1px dashed #000; margin-top: 25px; padding-bottom: 3px; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; border-top: 1px solid #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>REALITY INTEGRITY ENGINE (RIE)</h2>
            <h3>OFFICIAL FORNSIC VALIDATION SUMMARY RECORD</h3>
          </div>
          
          <div class="seal-box">
            <div><strong>VERIFICATION REGISTRATION HASH SEAL (SHA-256):</strong></div>
            <div style="word-break: break-all; color: #111; font-weight: bold; margin-top: 5px;">${verificationData.aiDetection.cryptographicHash}</div>
          </div>

          <div class="section-title">1. COMPOSITE RATING RECONCILIATION</div>
          <div class="score">FINAL REALITY INTEGRITY SCORE: ${verificationData.finalRealityScore}%</div>
          <div>Status: ${verificationData.finalRealityScore >= 70 ? 'VERIFIED AUTHENTIC OPTICAL SIGNAL' : 'WARNING: MANIPULATION METRICS TRIPPED'}</div>

          <div class="section-title">2. TRACKING FILE PROFILE METADATA</div>
          <div>• Original Asset Name: ${selectedFile ? selectedFile.name : 'N/A'}</div>
          <div>• Target Scan Classification Format: ${selectedFileType.toUpperCase()}</div>
          <div>• Detected Source Hardware Profile: ${verificationData.metadata.device}</div>
          <div>• Original Captured Epoch Vector: ${verificationData.metadata.timestamp}</div>
          <div>• Geometric Location Anchors: ${verificationData.metadata.gps}</div>

          <div class="section-title">3. DETECTOR LAYER FORENSIC HEURISTICS</div>
          <div>• Signal Pipeline Response Msg: ${verificationData.aiDetection.forgeryDetected}</div>
          <div>• Estimated Pixel Pixel Grid Consistency: ${verificationData.aiDetection.artifactScore}</div>

          <div class="section-title">4. REGULATORY SESSION SIGNATURE</div>
          <div>• Clearance Authorization Officer: ${activeUser.toUpperCase()}</div>
          <div>• System Local Report Generation Datetime: ${new Date().toLocaleString()}</div>

          <div class="footer">
            CONFIDENTIAL RECONCILIATION DATA CAPSULE - REALITY INTEGRITY ENGINE PIPELINE VERIFICATION PLATFORM v2.0
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getSortedLogs = () => {
    let sorted = [...historyLogs];
    if (filterType === 'latest') return sorted.reverse(); 
    if (filterType === 'highest-score') return sorted.sort((a, b) => b.finalRealityScore - a.finalRealityScore);
    if (filterType === 'lowest-score') return sorted.sort((a, b) => a.finalRealityScore - b.finalRealityScore);
    return sorted;
  };

  if (!userToken) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0d1117', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', border: '1px solid #30363d', backgroundColor: '#161b22', borderRadius: '6px', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <Shield size={48} color="#58a6ff" style={{ marginBottom: '0.5rem' }} />
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.4rem' }}>RIE GATEWAY INTERCEPT</h2>
            <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>Authorization Token Signature Required</span>
          </div>

          <form onSubmit={handleAuthSubmitAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#c9d1d9', marginBottom: '0.4rem' }}>Security Username</label>
              <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', outline: 'none' }} placeholder="Enter identifier blueprint" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#c9d1d9', marginBottom: '0.4rem' }}>Access Sequence Key</label>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', outline: 'none' }} placeholder="••••••••" />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.6rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              {authMode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
              {authMode === 'login' ? 'Authenticate Identity' : 'Register Secure Profile'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid #30363d', paddingTop: '1rem' }}>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: '0.85rem', cursor: 'pointer' }}>
              {authMode === 'login' ? "Don't have an operational token? Create profile" : 'Existing verified account? Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield size={28} color="#58a6ff" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>REALITY INTEGRITY ENGINE (RIE)</h2>
            <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>Multi-Modal Digital Verification Platform</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#c9d1d9' }}>Operator: <span style={{ color: '#58a6ff', fontWeight: 'bold' }}>{activeUser.toUpperCase()}</span></span>
          <span style={{ fontSize: '0.85rem' }}>Node API: <span className="status-badge status-online">{nodeStatus}</span></span>
          <button onClick={handleLogoutAction} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#21262d', color: '#f85149', border: '1px solid #30363d', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
            <LogOut size={14} /> Clear Token
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Upload size={18} color="#58a6ff" /> 1. Multi-Modal Upload Module
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {['image', 'video', 'audio'].map((type) => (
                <button key={type} onClick={() => setSelectedFileType(type)} style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #30363d', backgroundColor: selectedFileType === type ? '#1f6feb' : '#0d1117', color: 'white', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold' }}>{type}</button>
              ))}
            </div>
            <div style={{ border: '2px dashed #30363d', borderRadius: '6px', padding: '1.5rem 1rem', textAlign: 'center', backgroundColor: '#0d1117' }}>
              <input type="file" ref={fileInputRef} accept={getNativeAcceptStringValue()} onChange={handleFileChange} style={{ marginBottom: '1rem', color: '#c9d1d9', fontSize: '0.85rem', width: '100%' }} />
              <button className="btn-primary" onClick={triggerRealUpload} disabled={uploadState === 'uploading'} style={{ width: '100%' }}>
                {uploadState === 'uploading' ? 'Processing Stream...' : `Upload & Verify ${selectedFileType.toUpperCase()}`}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Layers size={18} color="#388bfd" /> 2. RIE System Process Pipeline
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#c9d1d9', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Module 6.2:</strong> Extracting Container Metadata & Fingerprints</li>
              <li><strong>Module 6.3:</strong> Cross-checking Active Media Compression Matrices</li>
              <li><strong>Module 6.4:</strong> Running Pretrained Multi-Modal Forensic Models</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {uploadState === 'idle' ? (
            <div className="card" style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#8b949e', minHeight: '350px' }}>
              <span>Awaiting authorized [{selectedFileType.toUpperCase()}] stream payload logic...</span>
            </div>
          ) : uploadState === 'uploading' ? (
            <div className="card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem', minHeight: '350px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #30363d', borderTopColor: '#58a6ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#58a6ff' }}>Validating integrated spectrum layers...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="card" style={{ borderColor: '#238636', backgroundColor: 'rgba(35,134,54,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#2ea44f', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={20} /> Reality Confidence Score</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#8b949e' }}>Composite validation accuracy rating</p>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2ea44f' }}>{verificationData.finalRealityScore}%</div>
              </div>

              {/* 📥 INJECTED EXPORT DOCUMENTATION CONTROL TRIGGER BUTTON */}
              <button className="btn-primary" onClick={generateForensicReportPrintStream} style={{ width: '100%', backgroundColor: '#21262d', border: '1px solid #30363d' }}>
                <Download size={16} color="#58a6ff" /> Download Cryptographic Verification Report
              </button>

              <div className="card">
                <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#58a6ff' }}><FileText size={16} /> Container Extraction Layer (Score: {verificationData.metadata.score}%)</h4>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>Spatial Specs/GPS: <span style={{ color: '#58a6ff' }}>{verificationData.metadata.gps}</span></div>
                  <div>Timestamp Vector: <span style={{ color: '#58a6ff' }}>{verificationData.metadata.timestamp}</span></div>
                  <div>Structural Device Core: <span style={{ color: '#ffbd44' }}>{verificationData.metadata.device}</span></div>
                </div>
              </div>

              <div className="card">
                <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f85149' }}><Eye size={16} /> AI Multi-Modal Forensic Layer</h4>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>Forensic Analysis: <span style={{ color: '#58a6ff' }}>{verificationData.aiDetection.forgeryDetected}</span></div>
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem', borderTop: '1px solid #21262d', paddingTop: '0.5rem', color: '#8b949e', fontSize: '0.75rem' }}>
                    SHA-256 Signature Seal: <span style={{ color: '#2ea44f' }}>{verificationData.aiDetection.cryptographicHash}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <section style={{ marginTop: '2rem' }} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ marginTop: 0, color: '#58a6ff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Layers size={18} /> 3. Verification History Matrix Logging</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0d1117', padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #30363d' }}>
            <ArrowUpDown size={14} color="#8b949e" />
            <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>Sort Matrix:</span>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ backgroundColor: 'transparent', color: 'white', border: 'none', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}>
              <option value="latest" style={{ backgroundColor: '#0d1117' }}>Latest Logs First</option>
              <option value="highest-score" style={{ backgroundColor: '#0d1117' }}>Highest Reality Score</option>
              <option value="lowest-score" style={{ backgroundColor: '#0d1117' }}>Lowest Reality Score</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #30363d', color: '#8b949e' }}>
                <th style={{ padding: '0.5rem' }}>Asset Identifier (SHA-256 Signature)</th>
                <th style={{ padding: '0.5rem' }}>Original Name</th>
                <th style={{ padding: '0.5rem' }}>Device Blueprint</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Reality Score</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Logging Vector Time</th>
              </tr>
            </thead>
            <tbody>
              {getSortedLogs().length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: '#8b949e' }}>No dynamic persistence logs recorded inside storage pipeline framework.</td>
                </tr>
              ) : (
                getSortedLogs().map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #21262d', color: '#c9d1d9' }}>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#58a6ff', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.fileHash}>{log.fileHash}</td>
                    <td style={{ padding: '0.6rem 0.5rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.originalName}</td>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#ffbd44' }}>{log.device}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: log.finalRealityScore >= 70 ? '#2ea44f' : '#f85149' }}>{log.finalRealityScore}%</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: '#8b949e' }}>{new Date(log.loggedAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;