import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { Palette, Globe, Mail, Image, Type, Eye, Download, CheckCircle, AlertCircle } from 'lucide-react';

const Branding = () => {
  const { appId } = useParams();
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, [appId]);

  const fetchBranding = async () => {
    try {
      const response = await api.get(`/branding/${appId}`);
      setBranding(response.data);
    } catch (error) {
      // If branding doesn't exist, create default
      setBranding({
        app_id: appId,
        primary_color: '#3B82F6',
        secondary_color: '#10B981',
        accent_color: '#8B5CF6',
        background_color: '#FFFFFF',
        text_color: '#1F2937',
        font_family: 'Inter, sans-serif',
        player_skin: 'default',
        show_logo_in_player: true,
        watermark_position: 'bottom-right'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      await api.post('/branding', branding);
      alert('Branding saved successfully!');
    } catch (error) {
      alert('Error saving branding: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setBranding(prev => ({ ...prev, [field]: value }));
  };

  const exportCSS = async () => {
    try {
      const response = await api.get(`/branding/export/${appId}`);
      const blob = new Blob([response.data.css_variables], { type: 'text/css' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'theme.css';
      a.click();
    } catch (error) {
      alert('Error exporting CSS');
    }
  };

  const tabs = [
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'images', label: 'Images', icon: Image },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'domain', label: 'Custom Domain', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Brand Customization</h1>
            <p className="text-gray-600 mt-1">Customize your streaming platform's look and feel</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {previewMode ? 'Exit Preview' : 'Preview'}
            </button>
            <button
              onClick={exportCSS}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSS
            </button>
            <button
              onClick={saveBranding}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 p-1 flex gap-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {/* Colors Tab */}
                {activeTab === 'colors' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Color Scheme</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={branding.primary_color}
                            onChange={(e) => updateField('primary_color', e.target.value)}
                            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={branding.primary_color}
                            onChange={(e) => updateField('primary_color', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={branding.secondary_color}
                            onChange={(e) => updateField('secondary_color', e.target.value)}
                            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={branding.secondary_color}
                            onChange={(e) => updateField('secondary_color', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={branding.accent_color}
                            onChange={(e) => updateField('accent_color', e.target.value)}
                            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={branding.accent_color}
                            onChange={(e) => updateField('accent_color', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={branding.background_color}
                            onChange={(e) => updateField('background_color', e.target.value)}
                            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={branding.background_color}
                            onChange={(e) => updateField('background_color', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Images Tab */}
                {activeTab === 'images' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Images & Logos</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                      <input
                        type="url"
                        value={branding.logo_url || ''}
                        onChange={(e) => updateField('logo_url', e.target.value)}
                        placeholder="https://cdn.example.com/logo.png"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Favicon URL</label>
                      <input
                        type="url"
                        value={branding.favicon_url || ''}
                        onChange={(e) => updateField('favicon_url', e.target.value)}
                        placeholder="https://cdn.example.com/favicon.ico"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Position</label>
                      <select
                        value={branding.watermark_position}
                        onChange={(e) => updateField('watermark_position', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Typography Tab */}
                {activeTab === 'typography' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Typography</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                      <select
                        value={branding.font_family}
                        onChange={(e) => updateField('font_family', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Inter, sans-serif">Inter</option>
                        <option value="Roboto, sans-serif">Roboto</option>
                        <option value="Open Sans, sans-serif">Open Sans</option>
                        <option value="Montserrat, sans-serif">Montserrat</option>
                        <option value="Poppins, sans-serif">Poppins</option>
                        <option value="Georgia, serif">Georgia</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Domain Tab */}
                {activeTab === 'domain' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Custom Domain</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
                      <input
                        type="text"
                        value={branding.custom_domain || ''}
                        onChange={(e) => updateField('custom_domain', e.target.value)}
                        placeholder="stream.yourdomain.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      {branding.custom_domain_verified ? (
                        <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Domain verified
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2 text-orange-600 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          Domain not verified
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Email Tab */}
                {activeTab === 'email' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Email Branding</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                      <input
                        type="email"
                        value={branding.support_email || ''}
                        onChange={(e) => updateField('support_email', e.target.value)}
                        placeholder="support@yourdomain.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Footer Text</label>
                      <textarea
                        value={branding.email_footer_text || ''}
                        onChange={(e) => updateField('email_footer_text', e.target.value)}
                        placeholder="© 2024 Your Company. All rights reserved."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows="3"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
              <div 
                className="rounded-lg p-6 space-y-4"
                style={{
                  backgroundColor: branding.background_color,
                  color: branding.text_color,
                  fontFamily: branding.font_family
                }}
              >
                {branding.logo_url && (
                  <img src={branding.logo_url} alt="Logo" className="h-8 mb-4" />
                )}
                <button
                  className="px-4 py-2 rounded-lg text-white w-full"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-white w-full"
                  style={{ backgroundColor: branding.secondary_color }}
                >
                  Secondary Button
                </button>
                <div
                  className="px-4 py-2 rounded-lg text-white text-center"
                  style={{ backgroundColor: branding.accent_color }}
                >
                  Accent Color
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Branding;