import React, { useState, useEffect } from 'react';
import { Table, Card, Modal, Form, Input, Button, message, Upload, Switch, Space, DatePicker } from 'antd';
import { UploadOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { fetchAbsenceRecords, submitAbsenceReason, updateAbsenceFlag } from '../services/api';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const AbsenceRecords = () => {
  const [absenceRecords, setAbsenceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form] = Form.useForm();
  const [updateLoading, setUpdateLoading] = useState(false);
  const [flagLoading, setFlagLoading] = useState(false);

  // 获取缺勤记录
  useEffect(() => {
    const loadAbsenceRecords = async () => {
      try {
        setLoading(true);
        const data = await fetchAbsenceRecords();
        setAbsenceRecords(data);
      } catch (error) {
        message.error('获取缺勤记录失败');
      } finally {
        setLoading(false);
      }
    };

    loadAbsenceRecords();
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

  // 提交缺勤原因
  const handleSubmitReason = async () => {
    try {
      const values = await form.validateFields();
      setUpdateLoading(true);
      
      // 处理图片上传，这里简化处理，实际应该上传到服务器获取URL
      const reasonData = {
        reason: values.reason,
        image_url: values.image ? values.image.fileList[0].originFileObj.name : null,
        preventive_measures: values.preventive_measures
      };
      
      await submitAbsenceReason(selectedRecord.id, reasonData);
      message.success('提交成功');
      handleCancel();
      
      // 刷新数据
      const data = await fetchAbsenceRecords();
      setAbsenceRecords(data);
    } catch (error) {
      message.error('提交失败');
    } finally {
      setUpdateLoading(false);
    }
  };

  // 更新flag状态
  const handleFlagChange = async (record, checked) => {
    try {
      setFlagLoading(true);
      await updateAbsenceFlag(record.id, checked);
      message.success('状态更新成功');
      
      // 刷新数据
      const data = await fetchAbsenceRecords();
      setAbsenceRecords(data);
    } catch (error) {
      message.error('状态更新失败');
    } finally {
      setFlagLoading(false);
    }
  };

  // 缺勤记录表列配置
  const absenceColumns = [
    {
      title: '员工ID',
      dataIndex: 'emp_id',
      key: 'emp_id',
      width: 120,
      sorter: (a, b) => a.emp_id - b.emp_id,
    },
    {
      title: '排班ID',
      dataIndex: 'shift_id',
      key: 'shift_id',
      width: 120,
      sorter: (a, b) => a.shift_id - b.shift_id,
    },
    {
      title: '缺勤开始时间',
      dataIndex: 'gap_start',
      key: 'gap_start',
      width: 180,
      render: (time) => new Date(time).toLocaleString(),
      sorter: (a, b) => new Date(a.gap_start) - new Date(b.gap_start),
    },
    {
      title: '缺勤结束时间',
      dataIndex: 'gap_end',
      key: 'gap_end',
      width: 180,
      render: (time) => new Date(time).toLocaleString(),
      sorter: (a, b) => new Date(a.gap_end) - new Date(b.gap_end),
    },
    {
      title: '缺勤时长(分钟)',
      dataIndex: 'gap_minutes',
      key: 'gap_minutes',
      width: 150,
      sorter: (a, b) => a.gap_minutes - b.gap_minutes,
    },
    {
      title: '统计日期',
      dataIndex: 'calc_date',
      key: 'calc_date',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.calc_date) - new Date(b.calc_date),
    },
    {
      title: '状态',
      dataIndex: 'flag',
      key: 'flag',
      width: 120,
      render: (flag) => (
        <span style={{ color: flag ? '#52c41a' : '#ff4d4f' }}>
          {flag ? '正常' : '缺勤'}
        </span>
      ),
      filters: [
        { text: '正常', value: true },
        { text: '缺勤', value: false },
      ],
      onFilter: (value, record) => record.flag === value,
    },
    {
      title: '缺勤原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small" 
            onClick={() => showReasonModal(record)}
            icon={<EditOutlined />}
          >
            提交原因
          </Button>
          <div>
            <Switch
              checked={record.flag || false}
              onChange={(checked) => handleFlagChange(record, checked)}
              loading={flagLoading}
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<CloseOutlined />}
              disabled={!record.reason}
            />
            <span style={{ marginLeft: 8 }}>HR确认</span>
          </div>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title="缺勤记录" 
      className="records-card"
    >
      <Table
        columns={absenceColumns}
        dataSource={absenceRecords}
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
        title={`提交员工 ${selectedRecord?.emp_id} 的缺勤原因`}
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
            label="缺勤原因"
            rules={[{ required: true, message: '请输入缺勤原因' }]}
          >
            <TextArea rows={4} placeholder="请输入缺勤原因" />
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

export default AbsenceRecords;