package com.frota.checklist.repository;

import com.frota.checklist.entity.Motorista;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MotoristaRepository extends JpaRepository<Motorista, Long> {
    Optional<Motorista> findByLogin(String login);
    Optional<Motorista> findByCpf(String cpf);
    boolean existsByLogin(String login);
    boolean existsByCpf(String cpf);
    boolean existsByCpfAndIdNot(String cpf, Long id);
    boolean existsByLoginAndIdNot(String login, Long id);
}
