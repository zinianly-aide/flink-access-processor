package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.entity.AbsenceRecord;
import com.example.flinkmonitorbackend.mapper.AbsenceRecordMapper;
import com.example.flinkmonitorbackend.service.AbsenceRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AbsenceRecordServiceImpl implements AbsenceRecordService {
    @Autowired
    private AbsenceRecordMapper absenceRecordMapper;

    @Override
    public List<AbsenceRecord> findAll() {
        return absenceRecordMapper.findAll();
    }

    @Override
    public AbsenceRecord findById(Long id) {
        return absenceRecordMapper.findById(id);
    }

    @Override
    public void update(AbsenceRecord record) {
        absenceRecordMapper.update(record);
    }
}