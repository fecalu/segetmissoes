package com.frota.checklist.service;

import com.frota.checklist.dto.LoginRequest;
import com.frota.checklist.dto.LoginResponse;
import com.frota.checklist.dto.MotoristaResponse;
import com.frota.checklist.dto.RegisterMotoristaRequest;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final MotoristaRepository motoristaRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.login(), request.senha())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        String token = jwtService.generateToken(userDetails);

        return new LoginResponse(token, userDetails.getMotoristaId(), userDetails.getNome(), userDetails.getPerfil());
    }

    public MotoristaResponse register(RegisterMotoristaRequest request) {
        if (motoristaRepository.existsByLogin(request.login())) {
            throw new BusinessException("Login ja cadastrado");
        }
        if (motoristaRepository.existsByCpf(request.cpf())) {
            throw new BusinessException("CPF ja cadastrado");
        }

        Motorista motorista = new Motorista();
        motorista.setNome(request.nome());
        motorista.setLogin(request.login());
        motorista.setSenha(passwordEncoder.encode(request.senha()));
        motorista.setCpf(request.cpf());
        motorista.setPerfil(Perfil.MOTORISTA);

        Motorista saved = motoristaRepository.save(motorista);
        return new MotoristaResponse(saved.getId(), saved.getNome(), saved.getLogin(), saved.getCpf(), saved.getPerfil());
    }
}
