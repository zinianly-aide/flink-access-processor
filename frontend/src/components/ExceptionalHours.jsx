import React, { useState, useEffect } from 'react';
import { Table, Card, Modal, Form, Input, Button, message, Upload, Switch, Space, Select } from 'antd';
import { UploadOutlined, EditOutlined, CheckOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  fetchExceptionalHoursRecords,
  submitExceptionalHoursReason,
  approveExceptionalHoursRecord
} from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

const ExceptionalHours = () => {
  const [exceptionalRecords, setExceptionalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form] = Form.useForm();
  const [updateLoading, setUpdateLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // 获取异常工时记录
  useEffect(() => {
    const loadExceptionalRecords = async () => {
      try {
        setLoading(true);
        const data = await fetchExceptionalHoursRecords();
        setExceptionalRecords(data);
      } catch (error) {
        message.error('获取异常工时记录失败');
      } finally {
        setLoading(false);
      }
    };

    loadExceptionalRecords();
  }, []);

  // 打开提交原因模态框
  const showReasonModal = (record) => {
    setSelectedRecord(record);
    form.setFieldsValue({});
    setIsModalVisible(true);
  };

  // 关闭模态框
  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedRecord(null);
    form.resetFields();
  };

  // 提交异常工时原因
  const handleSubmitReason = async () => {
    try {
      const values = await form.validateFields();
      setUpdateLoading(true);
      
      // 处理图片上传，这里简化处理，实际应该上传到服务器获取URL
      const reasonData = {
        reason: values.reason,
        image_url: values.image ? values.image.fileList[0]?.originFileObj?.name || null : null,
        preventive_measures: values.preventive_measures
      };
      
      await submitExceptionalHoursReason(selectedRecord.id, reasonData);
      message.success('提交成功');
      handleCancel();
      
      // 刷新数据
      const data = await fetchExceptionalHoursRecords();
      setExceptionalRecords(data);
    } catch (error) {
      message.error('提交失败');
    } finally {
      setUpdateLoading(false);
    }
  };

  // 审批异常工时记录
  const handleApproveRecord = async (record, approved) => {
    try {
      setApproveLoading(true);
      await approveExceptionalHoursRecord(record.id, 'HR');
      message.success('审批成功');
      
      // 刷新数据
      const data = await fetchExceptionalHoursRecords();
      setExceptionalRecords(data);
    } catch (error) {
      message.error('审批失败');
    } finally {
      setApproveLoading(false);
    }
  };

  // 处理状态筛选
  const handleStatusChange = (value) => {
    setStatusFilter(value);
    // 这里可以添加根据状态过滤数据的逻辑
  };

  // 导出Excel功能
  const exportToExcel = async () => {
    try {
      const response = await fetch('http://localhost:8082/api/exceptional-hours/records/export/excel', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'exceptional_hours_records.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success('导出成功');
      } else {
        throw new Error('导出失败');
      }
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 过滤数据
  const filteredRecords = statusFilter === 'all' 
    ? exceptionalRecords 
    : exceptionalRecords.filter(record => record.status === statusFilter);

  // 异常工时记录表列配置
  const exceptionalColumns = [
    {
      title: '员工ID',
      dataIndex: 'emp_id',
      key: 'emp_id',
      width: 120,
      sorter: (a, b) => a.emp_id - b.emp_id,
    },
    {
      title: '指标名称',
      dataIndex: 'indicator_name',
      key: 'indicator_name',
      width: 200,
    },
    {
      title: '指标类型',
      dataIndex: 'indicator_type',
      key: 'indicator_type',
      width: 150,
    },
    {
      title: '实际值',
      dataIndex: 'actual_value',
      key: 'actual_value',
      width: 120,
      sorter: (a, b) => a.actual_value - b.actual_value,
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      width: 120,
    },
    {
      title: '统计周期',
      key: 'period',
      width: 200,
      render: (_, record) => `${new Date(record.period_start).toLocaleDateString()} 至 ${new Date(record.period_end).toLocaleDateString()}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        let statusText = '待处理';
        let statusColor = '#ff7875';
        
        if (status === 'processed') {
          statusText = '已处理';
          statusColor = '#faad14';
        } else if (status === 'approved') {
          statusText = '已批准';
          statusColor = '#52c41a';
        }
        
        return <span style={{ color: statusColor }}>{statusText}</span>;
      },
      filters: [
        { text: '全部', value: 'all' },
        { text: '待处理', value: 'pending' },
        { text: '已处理', value: 'processed' },
        { text: '已批准', value: 'approved' },
      ],
      onFilter: (value, record) => value === 'all' || record.status === value,
    },
    {
      title: '原因说明',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_, record) => (
        <Space size="middle">
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              onClick={() => showReasonModal(record)}
              icon={<EditOutlined />}
            >
              提交原因
            </Button>
          )}
          {record.status === 'processed' && (
            <div>
              <Switch
                checked={record.status === 'approved'}
                onChange={(checked) => handleApproveRecord(record, checked)}
                loading={approveLoading}
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
              />
              <span style={{ marginLeft: 8 }}>HR确认</span>
            </div>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title="异常工时记录"
      className="records-card"
      extra={
        <Space>
          <Select 
            value={statusFilter} 
            onChange={handleStatusChange}
            style={{ width: 120 }}
          >
            <Option value="all">全部</Option>
            <Option value="pending">待处理</Option>
            <Option value="processed">已处理</Option>
            <Option value="approved">已批准</Option>
          </Select>
          <Button 
            type="primary" 
            onClick={exportToExcel}
            icon={<DownloadOutlined />}
          >
            导出Excel
          </Button>
        </Space>
      }
    >
      <Table
        columns={exceptionalColumns}
        dataSource={filteredRecords}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        scroll={{ x: 1000 }}
      />

      <Modal
        title={`提交员工 ${selectedRecord?.emp_id} 的异常工时原因`}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleSubmitReason}
            loading={updateLoading}
          >
            提交
          </Button>,
        ]}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{}}
        >
          <Form.Item
            name="reason"
            label="异常原因"
            rules={[{ required: true, message: '请输入异常原因' }]}
          >
            <TextArea rows={4} placeholder="请输入异常原因" />
          </Form.Item>

          <Form.Item
            name="image"
            label="图片说明"
          >
            <Upload
              name="image"
              listType="picture"
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>上传图片</Button>
            </Upload>
            <p className="ant-form-text" style={{ marginTop: 8 }}>
              支持JPG、PNG格式，不超过5MB
            </p>
          </Form.Item>

          <Form.Item
            name="preventive_measures"
            label="防范措施"
            rules={[{ required: true, message: '请输入后续防范措施' }]}
          >
            <TextArea rows={3} placeholder="请输入后续防范措施" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ExceptionalHours;