import React, { useState } from 'react';
import { Card, Input, Button, Tabs, Spin, Typography, Table, Space, message, Alert, Modal } from 'antd';
import { PlayCircleOutlined, BarChartOutlined, LineChartOutlined, PieChartOutlined, DownloadOutlined, HistoryOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { generateReport, getReportHistory, deleteReport } from '../services/api';
import { Bar, Line, Pie } from '@ant-design/charts';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const ReportGenerator = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [historyReports, setHistoryReports] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [deletingReport, setDeletingReport] = useState(null);

  // 生成报表
  const handleGenerateReport = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    setLoading(true);
    try {
      console.log('开始生成报表，查询语句:', query);
      const response = await generateReport(query);
      console.log('报表生成API返回结果:', response);
      
      // 检查返回结果是否有效
      if (response && response.id) {
        setReport(response);
        setActiveTab('report');
        message.success('报表生成成功');
        console.log('报表生成成功，ID:', response.id);
      } else {
        console.error('报表生成失败，返回结果格式不正确:', response);
        message.error('报表生成失败，返回结果格式不正确');
      }
    } catch (error) {
      console.error('报表生成失败，异常信息:', error);
      console.error('错误详情:', error.response ? error.response.data : error.message);
      message.error('报表生成失败，请检查网络或服务器状态');
    } finally {
      setLoading(false);
      console.log('报表生成流程结束');
    }
  };

  // 获取历史报表
  const handleGetReportHistory = async () => {
    setLoading(true);
    try {
      console.log('开始获取历史报表');
      const response = await getReportHistory();
      console.log('获取历史报表API返回结果:', response);
      
      // 检查返回结果是否有效
      if (Array.isArray(response)) {
        setHistoryReports(response);
        setShowHistory(true);
        console.log('获取历史报表成功，共', response.length, '条记录');
      } else {
        console.error('获取历史报表失败，返回结果格式不正确:', response);
        message.error('获取历史报表失败，返回结果格式不正确');
      }
    } catch (error) {
      console.error('获取历史报表失败，异常信息:', error);
      console.error('错误详情:', error.response ? error.response.data : error.message);
      message.error('获取历史报表失败，请检查网络或服务器状态');
    } finally {
      setLoading(false);
      console.log('获取历史报表流程结束');
    }
  };

  // 查看历史报表详情
  const handleViewHistoryReport = (report) => {
    setSelectedHistoryReport(report);
    setShowHistoryModal(true);
  };

  // 删除历史报表
  const handleDeleteHistoryReport = async (reportId) => {
    setDeletingReport(reportId);
    try {
      console.log('开始删除报表，ID:', reportId);
      const response = await deleteReport(reportId);
      console.log('删除报表API返回结果:', response);
      
      // 检查删除操作是否成功
      // 注意：删除操作成功时，服务器可能返回204 No Content，所以response可能为空
      setHistoryReports(historyReports.filter(report => report.id !== reportId));
      message.success('报表删除成功');
      console.log('报表删除成功，ID:', reportId);
    } catch (error) {
      console.error('报表删除失败，异常信息:', error);
      console.error('错误详情:', error.response ? error.response.data : error.message);
      message.error('报表删除失败，请检查网络或服务器状态');
    } finally {
      setDeletingReport(null);
      console.log('报表删除流程结束');
    }
  };

  // 渲染图表
  const renderChart = () => {
    if (!report || !report.data || report.data.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <Text type="secondary">暂无数据可生成图表</Text>
        </div>
      );
    }

    const chartConfig = report.chart_config || {};
    const chartType = report.chart_type || 'bar';
    const data = report.data;

    // 从数据中获取所有字段
    const fields = data.length > 0 ? Object.keys(data[0]) : [];
    
    // 为图表选择合适的x轴和y轴字段
    const xField = chartConfig.xField || fields[0];
    const yField = chartConfig.yField || fields[1];

    const commonConfig = {
      data,
      xField,
      yField,
      style: {
        height: 400,
        width: '100%',
      },
    };

    switch (chartType) {
      case 'line':
        return <Line {...commonConfig} />;
      case 'pie':
        return <Pie {...commonConfig} angleField={yField} colorField={xField} />;
      case 'bar':
      default:
        return <Bar {...commonConfig} />;
    }
  };

  // 表格列配置
  const getTableColumns = () => {
    if (!report || !report.data || report.data.length === 0) {
      return [];
    }

    const firstRow = report.data[0];
    return Object.keys(firstRow).map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      ellipsis: true,
      render: (text) => {
        if (typeof text === 'number') {
          return <Text strong>{text}</Text>;
        }
        return text;
      }
    }));
  };

  return (
    <Card 
      title="自动报表生成器" 
      className="records-card"
      style={{ marginBottom: '20px' }}
      extra={
        <Button 
          type="default" 
          onClick={handleGetReportHistory}
          icon={<HistoryOutlined />}
          loading={loading}
        >
          查看历史报表
        </Button>
      }
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        tabBarStyle={{ marginBottom: '20px' }}
      >
        <TabPane 
          tab={
            <span>
              <PlayCircleOutlined /> 生成报表
            </span>
          } 
          key="generate"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <TextArea
              placeholder="请输入自然语言查询语句，例如：'查询所有部门的总请假小时数排行'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              style={{ marginBottom: '16px' }}
            />
            <Button 
              type="primary" 
              onClick={handleGenerateReport}
              loading={loading}
              disabled={!query.trim()}
              icon={<PlayCircleOutlined />}
              size="large"
              style={{ width: '100%', height: '48px', fontSize: '16px' }}
            >
              生成报表
            </Button>

            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
              <Title level={5} style={{ marginBottom: '8px' }}>使用示例：</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>示例1：</Text> 查询所有部门的总请假小时数排行
                </div>
                <div>
                  <Text strong>示例2：</Text> 计算各部门的净加班小时数
                </div>
                <div>
                  <Text strong>示例3：</Text> 查询状态为待处理的异常工时记录数量
                </div>
                <div>
                  <Text strong>示例4：</Text> 找出连续工作天数最多的前5名员工
                </div>
              </Space>
            </div>
          </Space>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <BarChartOutlined /> 报表结果
            </span>
          } 
          key="report"
        >
          {!report ? (
            <div style={{ textAlign: 'center', padding: '80px' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                请先在"生成报表"标签页输入查询语句并生成报表
              </Text>
            </div>
          ) : (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Alert 
                message="报表生成成功" 
                description={`根据查询："${report.query}" 生成的报表`}
                type="success" 
                showIcon
              />

              <Tabs defaultActiveKey="chart" tabBarStyle={{ marginBottom: '20px' }}>
                <TabPane 
                  tab={<span><BarChartOutlined /> 图表</span>} 
                  key="chart"
                >
                  {renderChart()}
                </TabPane>

                <TabPane 
                  tab={<span><LineChartOutlined /> 数据表格</span>} 
                  key="table"
                >
                  <Table
                    columns={getTableColumns()}
                    dataSource={report.data.map((item, index) => ({ ...item, key: index }))}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                  />
                </TabPane>

                <TabPane 
                  tab={<span><PieChartOutlined /> 分析结果</span>} 
                  key="analysis"
                >
                  <div style={{ padding: '20px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px' }}>
                    <Title level={4} style={{ color: '#52c41a', marginBottom: '16px' }}>AI分析结论</Title>
                    <Text>{report.analysis}</Text>
                  </div>
                </TabPane>
              </Tabs>

              <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                <Title level={5} style={{ marginBottom: '12px' }}>生成的SQL</Title>
                <pre style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '4px', overflowX: 'auto' }}>
                  {report.sql}
                </pre>
              </div>
            </Space>
          )}
        </TabPane>
      </Tabs>

      {/* 历史报表模态框 */}
      <Modal
        title="历史报表"
        open={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        footer={null}
        width={800}
      >
        {selectedHistoryReport && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={5}>查询：{selectedHistoryReport.query}</Title>
              <Text type="secondary">生成时间：{new Date(selectedHistoryReport.created_at).toLocaleString()}</Text>
            </div>
            
            <Tabs defaultActiveKey="chart" tabBarStyle={{ marginBottom: '20px' }}>
              <TabPane 
                tab={<span><BarChartOutlined /> 图表</span>} 
                key="chart"
              >
                {selectedHistoryReport.data && selectedHistoryReport.data.length > 0 ? (
                  <Bar
                    data={selectedHistoryReport.data}
                    xField={selectedHistoryReport.chart_config?.xField || Object.keys(selectedHistoryReport.data[0])[0]}
                    yField={selectedHistoryReport.chart_config?.yField || Object.keys(selectedHistoryReport.data[0])[1]}
                    style={{ height: 400, width: '100%' }}
                  />
                ) : (
                  <Text type="secondary">暂无数据</Text>
                )}
              </TabPane>
              
              <TabPane 
                tab={<span><LineChartOutlined /> 数据表格</span>} 
                key="table"
              >
                <Table
                  columns={
                    selectedHistoryReport.data && selectedHistoryReport.data.length > 0 ? 
                    Object.keys(selectedHistoryReport.data[0]).map(key => ({
                      title: key,
                      dataIndex: key,
                      key: key,
                      ellipsis: true
                    })) : []
                  }
                  dataSource={selectedHistoryReport.data?.map((item, index) => ({ ...item, key: index })) || []}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 800 }}
                />
              </TabPane>
              
              <TabPane 
                tab={<span><PieChartOutlined /> 分析结果</span>} 
                key="analysis"
              >
                <div style={{ padding: '20px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px' }}>
                  <Title level={5} style={{ color: '#52c41a', marginBottom: '16px' }}>AI分析结论</Title>
                  <Text>{selectedHistoryReport.analysis}</Text>
                </div>
              </TabPane>
            </Tabs>
          </Space>
        )}
      </Modal>
    </Card>
  );
};

export default ReportGenerator;