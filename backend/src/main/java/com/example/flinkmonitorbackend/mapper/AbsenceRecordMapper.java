package com.example.flinkmonitorbackend.mapper;

import com.example.flinkmonitorbackend.entity.AbsenceRecord;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface AbsenceRecordMapper {
    List<AbsenceRecord> findAll();
    AbsenceRecord findById(Long id);
    void update(AbsenceRecord record);
}