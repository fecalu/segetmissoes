package com.frota.checklist.security;

import com.frota.checklist.entity.Motorista;
import com.frota.checklist.repository.MotoristaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final MotoristaRepository motoristaRepository;

    @Override
    public UserDetails loadUserByUsername(String username) {
        Motorista motorista = motoristaRepository.findByLogin(username)
                .orElseThrow(() -> new UsernameNotFoundException("Motorista nao encontrado"));
        return new CustomUserDetails(motorista);
    }
}
