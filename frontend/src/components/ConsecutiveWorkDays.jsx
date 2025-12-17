import React, { useState, useEffect } from 'react';
import { Table, Card, Modal, Button, message, Tag, Space } from 'antd';
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { fetchConsecutiveWorkDays, fetchAccessRecordsByEmployee } from '../services/api';
import axiosInstance from '../utils/axiosConfig';

const ConsecutiveWorkDays = () => {
  const [consecutiveDays, setConsecutiveDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessRecords, setAccessRecords] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // 导出Excel
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      const response = await axiosInstance.get('/consecutive-days/export/excel', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'consecutive_work_days.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 获取连续工作天数记录
  useEffect(() => {
    const loadConsecutiveDays = async () => {
      try {
        setLoading(true);
        const data = await fetchConsecutiveWorkDays();
        setConsecutiveDays(data);
      } catch (error) {
        message.error('获取连续工作天数失败');
      } finally {
        setLoading(false);
      }
    };

    loadConsecutiveDays();
  }, []);

  // 查看原始门禁记录
  const viewAccessRecords = async (employeeId) => {
    try {
      setAccessLoading(true);
      const data = await fetchAccessRecordsByEmployee(employeeId);
      setAccessRecords(data);
      setSelectedEmployee(employeeId);
      setIsModalVisible(true);
    } catch (error) {
      message.error('获取门禁记录失败');
    } finally {
      setAccessLoading(false);
    }
  };

  // 关闭模态框
  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedEmployee(null);
    setAccessRecords([]);
  };

  // 连续工作天数表列配置
  const consecutiveColumns = [
    {
      title: '员工ID',
      dataIndex: 'employee_id',
      key: 'employee_id',
      width: 120,
      sorter: (a, b) => a.employee_id.localeCompare(b.employee_id),
    },
    {
      title: '连续工作天数',
      dataIndex: 'consecutive_days',
      key: 'consecutive_days',
      width: 150,
      render: (days) => (
        <Tag color={days > 6 ? 'red' : 'blue'}>
          {days} 天
        </Tag>
      ),
      sorter: (a, b) => a.consecutive_days - b.consecutive_days,
    },
    {
      title: '开始日期',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.start_date) - new Date(b.start_date),
    },
    {
      title: '结束日期',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.end_date) - new Date(b.end_date),
    },
    {title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => viewAccessRecords(record.employee_id)}>
          查看原始记录
        </Button>
      ),
    },
  ];

  // 门禁记录表列配置（与提醒记录组件相同）
  const accessColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '员工ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 120,
    },
    {
      title: '访问时间',
      dataIndex: 'accessTime',
      key: 'accessTime',
      width: 180,
      render: (time) => new Date(time).toLocaleString(),
    },
    {
      title: '进出方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 100,
      filters: [
        { text: '进入', value: 'IN' },
        { text: '离开', value: 'OUT' },
      ],
      onFilter: (value, record) => record.direction === value,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => new Date(time).toLocaleString(),
    },
  ];

  return (
    <Card 
      title="连续工作天数" 
      className="records-card"
      extra={
        <Button 
          type="primary" 
          onClick={exportToExcel} 
          loading={exportLoading}
          icon={<DownloadOutlined />}
        >
          导出Excel
        </Button>
      }
    >
      <Table
        columns={consecutiveColumns}
        dataSource={consecutiveDays}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        scroll={{ x: 800 }}
      />

      <Modal
        title={`员工 ${selectedEmployee} 的门禁记录`}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <Table
          columns={accessColumns}
          dataSource={accessRecords}
          rowKey="id"
          loading={accessLoading}
          pagination={{
            pageSize: 8,
            showSizeChanger: true,
          }}
          scroll={{ x: 600 }}
        />
      </Modal>
    </Card>
  );
};

export default ConsecutiveWorkDays;