package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.entity.AbsenceRecord;
import java.util.List;

public interface AbsenceRecordService {
    List<AbsenceRecord> findAll();
    AbsenceRecord findById(Long id);
    void update(AbsenceRecord record);
}