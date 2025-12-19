import React from 'react'
import { Card, List, Typography, Tag, Button, Space } from 'antd'
import { ClockCircleOutlined, StarOutlined, RedoOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

const defaultTemplates = [
  '查询所有部门的总请假小时数排行',
  '计算各部门的净加班小时数',
  '查询状态为待处理的异常工时记录数量',
  '找出连续工作天数最多的前5名员工',
]

const QuerySidebar = ({ history, onSelect, onUseTemplate, onReplayRecent, recentSql }) => (
  <Space direction="vertical" style={{ width: '100%' }} size="middle">
    <Card size="small" title="最近查询/执行" extra={recentSql ? <Tag color="blue">最近SQL</Tag> : null}>
      {history.length === 0 ? (
        <Text type="secondary">暂无历史记录</Text>
      ) : (
        <List
          dataSource={history}
          size="small"
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(item)}
              actions={[<Tag key="time" icon={<ClockCircleOutlined />}>{new Date(item.timestamp).toLocaleTimeString()}</Tag>]}
            >
              <List.Item.Meta
                title={<Text ellipsis style={{ maxWidth: 180 }}>{item.query}</Text>}
                description={item.sql ? <Text type="secondary">{item.sql}</Text> : '自然语言执行'}
              />
            </List.Item>
          )}
        />
      )}
      {recentSql && (
        <Button style={{ marginTop: 8 }} size="small" icon={<RedoOutlined />} onClick={onReplayRecent} block>
          复用最近SQL
        </Button>
      )}
    </Card>

    <Card size="small" title="收藏模板" extra={<StarOutlined />}> 
      <List
        dataSource={defaultTemplates}
        size="small"
        renderItem={(item) => (
          <List.Item style={{ cursor: 'pointer' }} onClick={() => onUseTemplate(item)}>
            <List.Item.Meta title={<Text>{item}</Text>} />
          </List.Item>
        )}
      />
    </Card>
  </Space>
)

export default QuerySidebar
