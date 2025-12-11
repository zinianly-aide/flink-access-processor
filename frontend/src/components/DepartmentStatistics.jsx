import React, { useState, useEffect } from 'react';
import { Table, Card, Row, Col, Typography, Space } from 'antd';
import { Bar, Line } from '@ant-design/charts';
import { fetchDeptLeaveSummary, fetchDeptNetOvertimeSummary } from '../services/api';
import { ClockCircleOutlined, CalendarOutlined, SwapOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const DepartmentStatistics = () => {
  const [leaveSummary, setLeaveSummary] = useState([]);
  const [netOvertimeSummary, setNetOvertimeSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 获取部门请假汇总数据
        const leaveData = await fetchDeptLeaveSummary();
        setLeaveSummary(leaveData);

        // 获取部门净加班汇总数据
        const netOvertimeData = await fetchDeptNetOvertimeSummary();
        setNetOvertimeSummary(netOvertimeData);
      } catch (error) {
        console.error('Failed to load department statistics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 部门请假排行表格列配置
  const leaveColumns = [
    {
      title: '组织名称',
      dataIndex: 'org_name',
      key: 'org_name',
      sorter: (a, b) => a.org_name?.localeCompare(b.org_name),
    },
    {
      title: '请假记录数',
      dataIndex: 'total_leave_records',
      key: 'total_leave_records',
      align: 'right',
      sorter: (a, b) => a.total_leave_records - b.total_leave_records,
    },
    {
      title: '总请假小时数',
      dataIndex: 'total_leave_hours',
      key: 'total_leave_hours',
      align: 'right',
      sorter: (a, b) => a.total_leave_hours - b.total_leave_hours,
      render: (text) => text.toFixed(2),
    },
    {
      title: '平均请假小时数',
      dataIndex: 'avg_leave_hours',
      key: 'avg_leave_hours',
      align: 'right',
      sorter: (a, b) => a.avg_leave_hours - b.avg_leave_hours,
      render: (text) => text.toFixed(2),
    },
  ];

  // 部门净加班排行表格列配置
  const netOvertimeColumns = [
    {
      title: '组织名称',
      dataIndex: 'org_name',
      key: 'org_name',
      sorter: (a, b) => a.org_name?.localeCompare(b.org_name),
    },
    {
      title: '总加班小时数',
      dataIndex: 'total_overtime_hours',
      key: 'total_overtime_hours',
      align: 'right',
      sorter: (a, b) => a.total_overtime_hours - b.total_overtime_hours,
      render: (text) => text.toFixed(2),
    },
    {
      title: '总请假小时数',
      dataIndex: 'total_leave_hours',
      key: 'total_leave_hours',
      align: 'right',
      sorter: (a, b) => a.total_leave_hours - b.total_leave_hours,
      render: (text) => text.toFixed(2),
    },
    {
      title: '净加班小时数',
      dataIndex: 'net_overtime_hours',
      key: 'net_overtime_hours',
      align: 'right',
      sorter: (a, b) => a.net_overtime_hours - b.net_overtime_hours,
      render: (text) => text.toFixed(2),
    },
  ];

  // 部门请假排行柱状图配置
  const leaveBarConfig = {
    data: leaveSummary,
    xField: 'org_name',
    yField: 'total_leave_hours',
    seriesField: 'org_name',
    barStyle: {
      radius: [4, 4, 0, 0],
    },
    legend: {
      position: 'top',
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name: datum.org_name,
          value: datum.total_leave_hours,
        };
      },
    },
    height: 400,
  };

  // 部门净加班排行折线图配置
  const netOvertimeLineConfig = {
    data: netOvertimeSummary,
    xField: 'org_name',
    yField: ['total_overtime_hours', 'total_leave_hours', 'net_overtime_hours'],
    seriesField: 'org_name',
    legend: {
      position: 'top',
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name: datum.org_name,
          value: datum.value,
        };
      },
    },
    height: 400,
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>部门统计排行</Title>
      
      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title={<Space><CalendarOutlined /> 部门请假排行</Space>} variant="outlined">
            <Bar {...leaveBarConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<Space><SwapOutlined /> 部门净加班排行</Space>} variant="outlined">
            <Line {...netOvertimeLineConfig} />
          </Card>
        </Col>
      </Row>

      {/* 表格区域 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="部门请假详细汇总" variant="outlined">
            <Table
              columns={leaveColumns}
              dataSource={leaveSummary}
              rowKey="org_id"
              loading={loading}
              pagination={false}
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="部门净加班详细汇总" variant="outlined">
            <Table
              columns={netOvertimeColumns}
              dataSource={netOvertimeSummary}
              rowKey="org_id"
              loading={loading}
              pagination={false}
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DepartmentStatistics;