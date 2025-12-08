<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="/">
    <html>
        <head>
            <title>RTMP Streaming Statistics</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    padding: 20px;
                    margin: 0;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 30px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                }
                h1 {
                    text-align: center;
                    margin-bottom: 30px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }
                h2 {
                    margin-top: 30px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid rgba(255,255,255,0.3);
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    overflow: hidden;
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                th {
                    background: rgba(0,0,0,0.2);
                    font-weight: 600;
                }
                tr:hover {
                    background: rgba(255,255,255,0.05);
                }
                .status-live {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    margin-right: 5px;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin: 20px 0;
                }
                .stat-card {
                    background: rgba(255,255,255,0.05);
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                }
                .stat-value {
                    font-size: 2rem;
                    font-weight: bold;
                    margin: 10px 0;
                }
                .stat-label {
                    opacity: 0.8;
                    font-size: 0.9rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📊 RTMP Streaming Statistics</h1>
                
                <xsl:for-each select="rtmp">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">NGINX Version</div>
                            <div class="stat-value"><xsl:value-of select="nginx_version"/></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Uptime</div>
                            <div class="stat-value"><xsl:value-of select="naccepted"/></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Bytes In</div>
                            <div class="stat-value"><xsl:value-of select="format-number(bw_in div 1024 div 1024, '0.00')"/> MB/s</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Bytes Out</div>
                            <div class="stat-value"><xsl:value-of select="format-number(bw_out div 1024 div 1024, '0.00')"/> MB/s</div>
                        </div>
                    </div>

                    <xsl:for-each select="server">
                        <h2>Server</h2>
                        <xsl:for-each select="application">
                            <h3>Application: <xsl:value-of select="name"/></h3>
                            
                            <xsl:if test="live/stream">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Status</th>
                                            <th>Stream Name</th>
                                            <th>Time</th>
                                            <th>Bandwidth In</th>
                                            <th>Bandwidth Out</th>
                                            <th>Clients</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <xsl:for-each select="live/stream">
                                            <tr>
                                                <td><span class="status-live"></span> LIVE</td>
                                                <td><xsl:value-of select="name"/></td>
                                                <td><xsl:value-of select="format-number(time div 1000, '0')"/>s</td>
                                                <td><xsl:value-of select="format-number(bw_in div 1024, '0.00')"/> KB/s</td>
                                                <td><xsl:value-of select="format-number(bw_out div 1024, '0.00')"/> KB/s</td>
                                                <td><xsl:value-of select="count(client)"/></td>
                                            </tr>
                                            
                                            <xsl:for-each select="client">
                                                <tr style="background: rgba(255,255,255,0.02);">
                                                    <td></td>
                                                    <td colspan="2">
                                                        <small>
                                                            <xsl:choose>
                                                                <xsl:when test="publishing">📡 Publishing</xsl:when>
                                                                <xsl:otherwise>👁️ Viewing</xsl:otherwise>
                                                            </xsl:choose>
                                                            from <xsl:value-of select="address"/>
                                                        </small>
                                                    </td>
                                                    <td><small><xsl:value-of select="format-number(bytes_in div 1024 div 1024, '0.00')"/> MB</small></td>
                                                    <td><small><xsl:value-of select="format-number(bytes_out div 1024 div 1024, '0.00')"/> MB</small></td>
                                                    <td></td>
                                                </tr>
                                            </xsl:for-each>
                                        </xsl:for-each>
                                    </tbody>
                                </table>
                            </xsl:if>
                            
                            <xsl:if test="not(live/stream)">
                                <p style="text-align: center; opacity: 0.6; padding: 40px;">
                                    No active streams
                                </p>
                            </xsl:if>
                        </xsl:for-each>
                    </xsl:for-each>
                </xsl:for-each>
            </div>
        </body>
    </html>
</xsl:template>
</xsl:stylesheet>
