import React, { useState, useEffect } from 'react';
import { Table, Card, Row, Col, Typography, Space } from 'antd';
import { Bar, Radar } from '@ant-design/charts';
import { fetchOrganizationSummary, fetchOrganizations } from '../services/api';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const OrganizationSummary = () => {
  const [summaryData, setSummaryData] = useState([]);
  const [organizations, setOrganizations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 获取组织列表
        const orgData = await fetchOrganizations();
        const orgMap = {};
        orgData.forEach(org => {
          orgMap[org.id] = org.orgName;
        });
        setOrganizations(orgMap);

        // 获取组织汇总数据
        const summary = await fetchOrganizationSummary();
        setSummaryData(summary);
      } catch (error) {
        console.error('Failed to load organization summary data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 表格列配置
  const columns = [
    {
      title: '组织名称',
      dataIndex: 'org_id',
      key: 'org_id',
      render: (orgId) => organizations[orgId] || `组织${orgId}`,
      sorter: (a, b) => organizations[a.org_id]?.localeCompare(organizations[b.org_id]),
    },
    {
      title: '总记录数',
      dataIndex: 'total_records',
      key: 'total_records',
      align: 'right',
      sorter: (a, b) => a.total_records - b.total_records,
    },
    {
      title: '待处理',
      dataIndex: 'pending_count',
      key: 'pending_count',
      align: 'right',
      sorter: (a, b) => a.pending_count - b.pending_count,
      render: (text) => <Text type="warning"><ExclamationCircleOutlined /> {text}</Text>,
    },
    {
      title: '已处理',
      dataIndex: 'processed_count',
      key: 'processed_count',
      align: 'right',
      sorter: (a, b) => a.processed_count - b.processed_count,
      render: (text) => <Text type="info"><ClockCircleOutlined /> {text}</Text>,
    },
    {
      title: '已批准',
      dataIndex: 'approved_count',
      key: 'approved_count',
      align: 'right',
      sorter: (a, b) => a.approved_count - b.approved_count,
      render: (text) => <Text type="success"><CheckCircleOutlined /> {text}</Text>,
    },
    {
      title: '平均超时小时数',
      dataIndex: 'avg_exceed_hours',
      key: 'avg_exceed_hours',
      align: 'right',
      sorter: (a, b) => a.avg_exceed_hours - b.avg_exceed_hours,
      render: (text) => text.toFixed(2),
    },
  ];

  // 柱状图配置
  const barConfig = {
    data: summaryData.map(item => ({
      org: organizations[item.org_id] || `组织${item.org_id}`,
      平均超时小时数: item.avg_exceed_hours,
      总记录数: item.total_records,
    })),
    xField: 'org',
    yField: ['平均超时小时数', '总记录数'],
    seriesField: 'org',
    barStyle: {
      radius: [4, 4, 0, 0],
    },
    legend: {
      position: 'top',
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name: datum.org,
          value: datum.value,
        };
      },
    },
    height: 400,
  };

  // 雷达图配置
  const radarConfig = {
    data: summaryData.map(item => ({
      org: organizations[item.org_id] || `组织${item.org_id}`,
      待处理: item.pending_count,
      已处理: item.processed_count,
      已批准: item.approved_count,
      平均超时小时数: item.avg_exceed_hours,
    })),
    xField: 'indicator',
    yField: 'value',
    seriesField: 'org',
    legend: {
      position: 'top',
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name: datum.org,
          value: datum.value,
        };
      },
    },
    height: 400,
    // 数据转换，将对象转换为雷达图需要的格式
    transform: {
      type: 'fold',
      fields: ['待处理', '已处理', '已批准', '平均超时小时数'],
      key: 'indicator',
      value: 'value',
    },
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>组织异常工时汇总</Title>
      
      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="组织平均超时小时数对比" variant="outlined">
            <Bar {...barConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="组织指标雷达图" variant="outlined">
            <Radar {...radarConfig} />
          </Card>
        </Col>
      </Row>

      {/* 表格区域 */}
      <Card title="组织异常工时详细汇总" variant="outlined">
        <Table
          columns={columns}
          dataSource={summaryData}
          rowKey="org_id"
          loading={loading}
          pagination={false}
          scroll={{ x: 800 }}
          summary={(pageData) => {
            const totalRecords = pageData.reduce((sum, item) => sum + item.total_records, 0);
            const pendingCount = pageData.reduce((sum, item) => sum + item.pending_count, 0);
            const processedCount = pageData.reduce((sum, item) => sum + item.processed_count, 0);
            const approvedCount = pageData.reduce((sum, item) => sum + item.approved_count, 0);
            const totalExceedHours = pageData.reduce((sum, item) => sum + (item.avg_exceed_hours * item.total_records), 0);
            const avgExceedHours = totalRecords > 0 ? totalExceedHours / totalRecords : 0;

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><Text strong>总计</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right"><Text strong>{totalRecords}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><Text type="warning"><ExclamationCircleOutlined /> {pendingCount}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right"><Text type="info"><ClockCircleOutlined /> {processedCount}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><Text type="success"><CheckCircleOutlined /> {approvedCount}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right"><Text strong>{avgExceedHours.toFixed(2)}</Text></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default OrganizationSummary;